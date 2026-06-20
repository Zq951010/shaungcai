/**
 * 智能预测引擎 v2.0
 * 基于多模型融合的彩票号码预测
 * 算法：马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合
 */

// ==================== 工具函数 ====================

function unique(arr) {
  var seen = {};
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    if (!seen[arr[i]]) {
      seen[arr[i]] = true;
      result.push(arr[i]);
    }
  }
  return result;
}

function arrayContains(arr, val) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === val) return true;
  }
  return false;
}

function sum(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return s; }
function max(arr) { return Math.max.apply(null, arr); }
function min(arr) { return Math.min.apply(null, arr); }
function span(arr) { return arr.length ? max(arr) - min(arr) : 0; }

// ==================== 算法1：马尔可夫转移概率 ====================
function markovTransitionProb(history, lastDraw, maxNum, pickCount) {
  var scores = {};
  for (var n = 1; n <= maxNum; n++) {
    var score = 0;
    for (var j = 0; j < lastDraw.length; j++) {
      var prevNum = lastDraw[j];
      var transitions = 0;
      var total = 0;
      for (var i = 1; i < history.length; i++) {
        if (arrayContains(history[i - 1], prevNum)) {
          total++;
          if (arrayContains(history[i], n)) transitions++;
        }
      }
      if (total > 0) score += transitions / total;
    }
    scores[n] = score;
  }
  return scores;
}

// ==================== 算法2：号码共现关联分析 ====================
function cooccurrenceAnalysis(history, maxNum) {
  var scores = {};
  for (var n = 1; n <= maxNum; n++) {
    var score = 0;
    for (var m = 1; m <= maxNum; m++) {
      if (m === n) continue;
      var coocCount = 0;
      var totalCount = 0;
      for (var i = 0; i < history.length; i++) {
        var hasM = arrayContains(history[i], m);
        var hasN = arrayContains(history[i], n);
        if (hasM) totalCount++;
        if (hasM && hasN) coocCount++;
      }
      if (totalCount > 0) score += coocCount / totalCount;
    }
    scores[n] = score;
  }
  return scores;
}

// ==================== 算法3：位置模式学习 ====================
function positionPatternLearning(history, maxNum, pickCount) {
  var scores = {};
  for (var n = 1; n <= maxNum; n++) {
    var score = 0;
    for (var pos = 0; pos < pickCount; pos++) {
      var posCount = 0;
      for (var i = 0; i < history.length; i++) {
        if (history[i][pos] === n) posCount++;
      }
      score += posCount / history.length;
    }
    scores[n] = score;
  }
  return scores;
}

// ==================== 算法4：趋势动量分析 ====================
function trendMomentumAnalysis(history, maxNum) {
  var scores = {};
  var half = Math.floor(history.length / 2);
  if (half < 1) half = 1;
  for (var n = 1; n <= maxNum; n++) {
    var recent = 0, older = 0;
    for (var i = 0; i < half && i < history.length; i++) {
      if (arrayContains(history[i], n)) recent++;
    }
    for (var i = half; i < history.length; i++) {
      if (arrayContains(history[i], n)) older++;
    }
    var momentum = (recent / half) - (older / Math.max(1, history.length - half));
    scores[n] = momentum > 0 ? momentum * 1.5 : Math.abs(momentum) * 0.8;
  }
  return scores;
}

// ==================== 算法5：贝叶斯融合决策 ====================
function bayesianFusion(markovScores, coocScores, posScores, trendScores, maxNum) {
  var totalM = 0, totalC = 0, totalP = 0, totalT = 0;
  for (var k = 1; k <= maxNum; k++) {
    totalM += markovScores[k] || 0;
    totalC += coocScores[k] || 0;
    totalP += posScores[k] || 0;
    totalT += trendScores[k] || 0;
  }

  var results = [];
  for (var n = 1; n <= maxNum; n++) {
    var mScore = markovScores[n] || 0;
    var cScore = coocScores[n] || 0;
    var pScore = posScores[n] || 0;
    var tScore = trendScores[n] || 0;

    var nm = totalM > 0 ? mScore / totalM : 0;
    var nc = totalC > 0 ? cScore / totalC : 0;
    var np = totalP > 0 ? pScore / totalP : 0;
    var nt = totalT > 0 ? tScore / totalT : 0;

    var fusion = Math.pow(nm + 0.01, 0.3) * Math.pow(nc + 0.01, 0.3) * Math.pow(np + 0.01, 0.2) * Math.pow(nt + 0.01, 0.2);

    results.push({
      num: n,
      score: fusion,
      markov: mScore,
      cooc: cScore,
      pos: pScore,
      trend: tScore
    });
  }

  results.sort(function(a, b) { return b.score - a.score; });
  return results;
}

// ==================== 后区/蓝球智能推荐（通用） ====================
function smartRecommendBack(allBacks, lastBack, maxNum, pickCount, set) {
  var markov = markovTransitionProb(allBacks, lastBack, maxNum, pickCount);
  var cooc = cooccurrenceAnalysis(allBacks, maxNum);
  var pos = positionPatternLearning(allBacks, maxNum, lastBack.length);
  var trend = trendMomentumAnalysis(allBacks, maxNum);
  var fused = bayesianFusion(markov, cooc, pos, trend, maxNum);

  var picks = [];
  var used = {};
  var start = set;
  for (var i = start; i < fused.length && picks.length < pickCount; i++) {
    var n = fused[i].num;
    if (!used[n]) {
      picks.push(n);
      used[n] = true;
    }
  }
  picks.sort(function(a, b) { return a - b; });
  return picks;
}

// ==================== 大乐透智能推荐（胆拖模式） ====================
function smartRecommendDLT(history, lastDraw) {
  var allFronts = [];
  var allBacks = [];
  for (var i = 0; i < history.length; i++) {
    var parts = history[i].split('|');
    allFronts.push(parts[0].split(',').map(Number));
    allBacks.push(parts[1].split(',').map(Number));
  }

  var markov = markovTransitionProb(allFronts, lastDraw.front, 35, 5);
  var cooc = cooccurrenceAnalysis(allFronts, 35);
  var pos = positionPatternLearning(allFronts, 35, 5);
  var trend = trendMomentumAnalysis(allFronts, 35);
  var fused = bayesianFusion(markov, cooc, pos, trend, 35);

  // 计算平均融合分
  var avgScore = 0;
  for (var i = 0; i < fused.length; i++) avgScore += fused[i].score;
  avgScore = avgScore / fused.length;

  // 选胆码：融合分 >= 平均分*1.3 且至少被2种算法看好，最多2个
  var danma = [];
  for (var i = 0; i < fused.length && danma.length < 2; i++) {
    var f = fused[i];
    var algoCount = 0;
    if (f.markov > 0) algoCount++;
    if (f.cooc > 0) algoCount++;
    if (f.pos > 0) algoCount++;
    if (f.trend > 0) algoCount++;
    if (f.score >= avgScore * 1.3 && algoCount >= 2) {
      danma.push(f.num);
    }
  }
  // 如果不够2个，取top scorer补足
  while (danma.length < 2) {
    danma.push(fused[danma.length].num);
  }

  // 选拖码池：排除胆码后的top 8
  var danmaSet = {};
  for (var i = 0; i < danma.length; i++) danmaSet[danma[i]] = true;
  var tuomaPool = [];
  for (var i = 0; i < fused.length && tuomaPool.length < 8; i++) {
    if (!danmaSet[fused[i].num]) {
      tuomaPool.push(fused[i].num);
    }
  }

  // 后区胆拖
  var backFused = [];
  for (var n = 1; n <= 12; n++) {
    var score = 0;
    for (var j = 0; j < lastDraw.back.length; j++) {
      for (var i = 1; i < allBacks.length; i++) {
        if (allBacks[i-1].indexOf(lastDraw.back[j]) >= 0 && allBacks[i].indexOf(n) >= 0) score++;
      }
    }
    backFused.push({num: n, score: score});
  }
  backFused.sort(function(a, b) { return b.score - a.score; });
  var backDan = backFused[0].num;
  var backTuoma = [];
  for (var i = 1; i < backFused.length && backTuoma.length < 3; i++) {
    backTuoma.push(backFused[i].num);
  }

  // 生成3组方案
  var recommendations = [];
  for (var set = 0; set < 3; set++) {
    var tuomaOffset = set;
    var frontPicks = danma.slice();
    for (var i = tuomaOffset; i < tuomaOffset + 3 && i < tuomaPool.length; i++) {
      frontPicks.push(tuomaPool[i]);
    }
    frontPicks.sort(function(a, b) { return a - b; });

    var backPicks = [backDan, backTuoma[set % backTuoma.length]];
    backPicks.sort(function(a, b) { return a - b; });

    recommendations.push({
      front: frontPicks,
      back: backPicks,
      danma: danma.slice(),
      tuoma: frontPicks.filter(function(n) { return danmaSet[n] ? false : true; }),
      backDan: backDan,
      backTuoma: backPicks.filter(function(n) { return n !== backDan; }),
      topScore: fused[0],
      scores: fused.slice(0, 10),
      avgScore: avgScore
    });
  }

  // 为每个号码生成选号理由
  var allPickedNums = [];
  for (var i = 0; i < recommendations.length; i++) {
    for (var j = 0; j < recommendations[i].front.length; j++) {
      if (allPickedNums.indexOf(recommendations[i].front[j]) < 0) {
        allPickedNums.push(recommendations[i].front[j]);
      }
    }
  }

  // 为每个前区号码生成理由
  var reasonMap = {};
  for (var i = 0; i < allPickedNums.length; i++) {
    var n = allPickedNums[i];
    var scoreData = null;
    for (var j = 0; j < fused.length; j++) {
      if (fused[j].num === n) { scoreData = fused[j]; break; }
    }
    reasonMap[n] = analyzeNumberReason(n, allFronts, lastDraw.front, scoreData || {}, 35, true);
  }

  // 将理由添加到每个推荐中
  for (var i = 0; i < recommendations.length; i++) {
    recommendations[i].reasons = {};
    for (var j = 0; j < recommendations[i].front.length; j++) {
      recommendations[i].reasons[recommendations[i].front[j]] = reasonMap[recommendations[i].front[j]];
    }
    // 后区理由
    recommendations[i].backReasons = {};
    for (var j = 0; j < recommendations[i].back.length; j++) {
      var bn = recommendations[i].back[j];
      var bMiss = 0;
      for (var k = 0; k < allBacks.length; k++) {
        if (allBacks[k].indexOf(bn) >= 0) break;
        bMiss++;
      }
      var bRecent = 0;
      for (var k = 0; k < 5 && k < allBacks.length; k++) {
        if (allBacks[k].indexOf(bn) >= 0) bRecent++;
      }
      var bReasons = [];
      if (lastDraw.back.indexOf(bn) >= 0) bReasons.push('重号');
      if (bMiss >= 4) bReasons.push('遗漏' + bMiss + '期回补');
      if (bRecent >= 2) bReasons.push('热号');
      else if (bRecent === 0) bReasons.push('冷号回补');
      recommendations[i].backReasons[bn] = bReasons.length > 0 ? bReasons.join('；') : '综合评分较高';
    }
  }

  return recommendations;
}

// ==================== 双色球智能推荐（胆拖模式） ====================
function smartRecommendSSQ(history, lastDraw) {
  var allReds = [];
  var allBlues = [];
  for (var i = 0; i < history.length; i++) {
    var parts = history[i].split('|');
    allReds.push(parts[0].split(',').map(Number));
    allBlues.push(parseInt(parts[1], 10));
  }

  var markov = markovTransitionProb(allReds, lastDraw.red, 33, 6);
  var cooc = cooccurrenceAnalysis(allReds, 33);
  var pos = positionPatternLearning(allReds, 33, 6);
  var trend = trendMomentumAnalysis(allReds, 33);
  var fused = bayesianFusion(markov, cooc, pos, trend, 33);

  // 计算平均融合分
  var avgScore = 0;
  for (var i = 0; i < fused.length; i++) avgScore += fused[i].score;
  avgScore = avgScore / fused.length;

  // 选胆码：融合分 >= 平均分*1.3 且至少被2种算法看好，最多2个
  var danma = [];
  for (var i = 0; i < fused.length && danma.length < 2; i++) {
    var f = fused[i];
    var algoCount = 0;
    if (f.markov > 0) algoCount++;
    if (f.cooc > 0) algoCount++;
    if (f.pos > 0) algoCount++;
    if (f.trend > 0) algoCount++;
    if (f.score >= avgScore * 1.3 && algoCount >= 2) {
      danma.push(f.num);
    }
  }
  // 如果不够2个，取top scorer补足
  while (danma.length < 2) {
    danma.push(fused[danma.length].num);
  }

  // 选拖码池：排除胆码后的top 8
  var danmaSet = {};
  for (var i = 0; i < danma.length; i++) danmaSet[danma[i]] = true;
  var tuomaPool = [];
  for (var i = 0; i < fused.length && tuomaPool.length < 8; i++) {
    if (!danmaSet[fused[i].num]) {
      tuomaPool.push(fused[i].num);
    }
  }

  // 蓝球：取融合分最高的1个
  var blueMarkov = markovTransitionProb(allBlues.map(function(b) { return [b]; }), [lastDraw.blue], 16, 1);
  var blueCooc = cooccurrenceAnalysis(allBlues.map(function(b) { return [b]; }), 16);
  var bluePos = positionPatternLearning(allBlues.map(function(b) { return [b]; }), 16, 1);
  var blueTrend = trendMomentumAnalysis(allBlues.map(function(b) { return [b]; }), 16);
  var blueFused = bayesianFusion(blueMarkov, blueCooc, bluePos, blueTrend, 16);
  var bluePick = blueFused[0].num;

  // 生成3组方案
  var recommendations = [];
  for (var set = 0; set < 3; set++) {
    var tuomaOffset = set;
    var redPicks = danma.slice();
    for (var i = tuomaOffset; i < tuomaOffset + 4 && i < tuomaPool.length; i++) {
      redPicks.push(tuomaPool[i]);
    }
    redPicks.sort(function(a, b) { return a - b; });

    recommendations.push({
      red: redPicks,
      blue: bluePick,
      danma: danma.slice(),
      tuoma: redPicks.filter(function(n) { return danmaSet[n] ? false : true; }),
      topScore: fused[0],
      scores: fused.slice(0, 10),
      avgScore: avgScore
    });
  }

  // 为每个号码生成选号理由
  var allPickedReds = [];
  for (var i = 0; i < recommendations.length; i++) {
    for (var j = 0; j < recommendations[i].red.length; j++) {
      if (allPickedReds.indexOf(recommendations[i].red[j]) < 0) {
        allPickedReds.push(recommendations[i].red[j]);
      }
    }
  }

  // 为每个红球号码生成理由
  var reasonMap = {};
  for (var i = 0; i < allPickedReds.length; i++) {
    var n = allPickedReds[i];
    var scoreData = null;
    for (var j = 0; j < fused.length; j++) {
      if (fused[j].num === n) { scoreData = fused[j]; break; }
    }
    reasonMap[n] = analyzeNumberReason(n, allReds, lastDraw.red, scoreData || {}, 33, true);
  }

  // 将理由添加到每个推荐中
  for (var i = 0; i < recommendations.length; i++) {
    recommendations[i].reasons = {};
    for (var j = 0; j < recommendations[i].red.length; j++) {
      recommendations[i].reasons[recommendations[i].red[j]] = reasonMap[recommendations[i].red[j]];
    }
    // 蓝球理由
    var bn = recommendations[i].blue;
    var bMiss = 0;
    for (var k = 0; k < allBlues.length; k++) {
      if (allBlues[k] === bn) break;
      bMiss++;
    }
    var bRecent = 0;
    for (var k = 0; k < 5 && k < allBlues.length; k++) {
      if (allBlues[k] === bn) bRecent++;
    }
    var bReasons = [];
    if (lastDraw.blue === bn) bReasons.push('重号');
    if (bMiss >= 4) bReasons.push('遗漏' + bMiss + '期回补');
    if (bRecent >= 2) bReasons.push('热号');
    else if (bRecent === 0) bReasons.push('冷号回补');
    recommendations[i].blueReason = bReasons.length > 0 ? bReasons.join('；') : '综合评分较高';
  }

  return recommendations;
}

// ==================== 快乐8智能推荐（胆拖模式） ====================
function smartRecommendKL8(history, lastDraw) {
  var allNums = [];
  for (var i = 0; i < history.length; i++) {
    allNums.push(history[i].split(',').map(Number).sort(function(a, b) { return a - b; }));
  }

  var markov = markovTransitionProb(allNums, lastDraw, 80, 20);
  var cooc = cooccurrenceAnalysis(allNums, 80);
  var pos = positionPatternLearning(allNums, 80, 20);
  var trend = trendMomentumAnalysis(allNums, 80);
  var fused = bayesianFusion(markov, cooc, pos, trend, 80);

  // 计算平均融合分
  var avgScore = 0;
  for (var i = 0; i < fused.length; i++) avgScore += fused[i].score;
  avgScore = avgScore / fused.length;

  // 选胆码：融合分 >= 平均分*1.3 且至少被2种算法看好，最多3个
  var danma = [];
  for (var i = 0; i < fused.length && danma.length < 3; i++) {
    var f = fused[i];
    var algoCount = 0;
    if (f.markov > 0) algoCount++;
    if (f.cooc > 0) algoCount++;
    if (f.pos > 0) algoCount++;
    if (f.trend > 0) algoCount++;
    if (f.score >= avgScore * 1.3 && algoCount >= 2) {
      danma.push(f.num);
    }
  }
  // 如果不够3个，取top scorer补足
  while (danma.length < 3) {
    danma.push(fused[danma.length].num);
  }

  // 选拖码池：排除胆码后的top 12
  var danmaSet = {};
  for (var i = 0; i < danma.length; i++) danmaSet[danma[i]] = true;
  var tuomaPool = [];
  for (var i = 0; i < fused.length && tuomaPool.length < 12; i++) {
    if (!danmaSet[fused[i].num]) {
      tuomaPool.push(fused[i].num);
    }
  }

  // 生成3组方案
  var recommendations = [];
  for (var set = 0; set < 3; set++) {
    var tuomaOffset = set * 2;
    var picks = danma.slice();
    for (var i = tuomaOffset; i < tuomaOffset + 7 && i < tuomaPool.length; i++) {
      picks.push(tuomaPool[i]);
    }
    picks.sort(function(a, b) { return a - b; });

    recommendations.push({
      picks: picks,
      danma: danma.slice(),
      tuoma: picks.filter(function(n) { return danmaSet[n] ? false : true; }),
      topScore: fused[0],
      scores: fused.slice(0, 10),
      avgScore: avgScore
    });
  }

  // 为每个号码生成选号理由
  var allPickedNums = [];
  for (var i = 0; i < recommendations.length; i++) {
    for (var j = 0; j < recommendations[i].picks.length; j++) {
      if (allPickedNums.indexOf(recommendations[i].picks[j]) < 0) {
        allPickedNums.push(recommendations[i].picks[j]);
      }
    }
  }

  // 为每个号码生成理由
  var reasonMap = {};
  for (var i = 0; i < allPickedNums.length; i++) {
    var n = allPickedNums[i];
    var scoreData = null;
    for (var j = 0; j < fused.length; j++) {
      if (fused[j].num === n) { scoreData = fused[j]; break; }
    }
    reasonMap[n] = analyzeNumberReason(n, allNums, lastDraw, scoreData || {}, 80, true);
  }

  // 将理由添加到每个推荐中
  for (var i = 0; i < recommendations.length; i++) {
    recommendations[i].reasons = {};
    for (var j = 0; j < recommendations[i].picks.length; j++) {
      recommendations[i].reasons[recommendations[i].picks[j]] = reasonMap[recommendations[i].picks[j]];
    }
  }

  return recommendations;
}

// ==================== 排列三智能推荐（胆拖模式） ====================
function smartRecommendPL3(history, lastDraw) {
  var allNums = [];
  for (var i = 0; i < history.length; i++) {
    allNums.push(history[i].numbers);
  }

  var markov = markovTransitionProb(allNums, lastDraw, 9, 3);
  var cooc = cooccurrenceAnalysis(allNums, 9);
  var pos = positionPatternLearning(allNums, 9, 3);
  var trend = trendMomentumAnalysis(allNums, 9);
  var fused = bayesianFusion(markov, cooc, pos, trend, 9);

  // 计算平均融合分
  var avgScore = 0;
  for (var i = 0; i < fused.length; i++) avgScore += fused[i].score;
  avgScore = avgScore / fused.length;

  // 选胆码：融合分 >= 平均分*1.3 且至少被2种算法看好，最多1个
  var danma = [];
  for (var i = 0; i < fused.length && danma.length < 1; i++) {
    var f = fused[i];
    var algoCount = 0;
    if (f.markov > 0) algoCount++;
    if (f.cooc > 0) algoCount++;
    if (f.pos > 0) algoCount++;
    if (f.trend > 0) algoCount++;
    if (f.score >= avgScore * 1.3 && algoCount >= 2) {
      danma.push(f.num);
    }
  }
  // 如果不够1个，取top scorer补足
  while (danma.length < 1) {
    danma.push(fused[danma.length].num);
  }

  // 选拖码池：排除胆码后的top 5
  var danmaSet = {};
  for (var i = 0; i < danma.length; i++) danmaSet[danma[i]] = true;
  var tuomaPool = [];
  for (var i = 0; i < fused.length && tuomaPool.length < 5; i++) {
    if (!danmaSet[fused[i].num]) {
      tuomaPool.push(fused[i].num);
    }
  }

  // 生成3组方案
  var recommendations = [];
  for (var set = 0; set < 3; set++) {
    var tuomaOffset = set;
    var picks = danma.slice();
    for (var i = tuomaOffset; i < tuomaOffset + 2 && i < tuomaPool.length; i++) {
      picks.push(tuomaPool[i]);
    }
    picks.sort(function(a, b) { return a - b; });

    recommendations.push({
      picks: picks,
      danma: danma.slice(),
      tuoma: picks.filter(function(n) { return danmaSet[n] ? false : true; }),
      topScore: fused[0],
      scores: fused.slice(0, 10),
      avgScore: avgScore
    });
  }

  // 为每个号码生成选号理由
  var allPickedNums = [];
  for (var i = 0; i < recommendations.length; i++) {
    for (var j = 0; j < recommendations[i].picks.length; j++) {
      if (allPickedNums.indexOf(recommendations[i].picks[j]) < 0) {
        allPickedNums.push(recommendations[i].picks[j]);
      }
    }
  }

  // 为每个号码生成理由
  var reasonMap = {};
  for (var i = 0; i < allPickedNums.length; i++) {
    var n = allPickedNums[i];
    var scoreData = null;
    for (var j = 0; j < fused.length; j++) {
      if (fused[j].num === n) { scoreData = fused[j]; break; }
    }
    reasonMap[n] = analyzeNumberReason(n, allNums, lastDraw, scoreData || {}, 9, false);
  }

  // 将理由添加到每个推荐中
  for (var i = 0; i < recommendations.length; i++) {
    recommendations[i].reasons = {};
    for (var j = 0; j < recommendations[i].picks.length; j++) {
      recommendations[i].reasons[recommendations[i].picks[j]] = reasonMap[recommendations[i].picks[j]];
    }
  }

  return recommendations;
}

// ==================== 排列五智能推荐（胆拖模式） ====================
function smartRecommendPL5(history, lastDraw) {
  var allNums = [];
  for (var i = 0; i < history.length; i++) {
    allNums.push(history[i].numbers);
  }

  var markov = markovTransitionProb(allNums, lastDraw, 9, 5);
  var cooc = cooccurrenceAnalysis(allNums, 9);
  var pos = positionPatternLearning(allNums, 9, 5);
  var trend = trendMomentumAnalysis(allNums, 9);
  var fused = bayesianFusion(markov, cooc, pos, trend, 9);

  // 计算平均融合分
  var avgScore = 0;
  for (var i = 0; i < fused.length; i++) avgScore += fused[i].score;
  avgScore = avgScore / fused.length;

  // 选胆码：融合分 >= 平均分*1.3 且至少被2种算法看好，最多2个
  var danma = [];
  for (var i = 0; i < fused.length && danma.length < 2; i++) {
    var f = fused[i];
    var algoCount = 0;
    if (f.markov > 0) algoCount++;
    if (f.cooc > 0) algoCount++;
    if (f.pos > 0) algoCount++;
    if (f.trend > 0) algoCount++;
    if (f.score >= avgScore * 1.3 && algoCount >= 2) {
      danma.push(f.num);
    }
  }
  // 如果不够2个，取top scorer补足
  while (danma.length < 2) {
    danma.push(fused[danma.length].num);
  }

  // 选拖码池：排除胆码后的top 6
  var danmaSet = {};
  for (var i = 0; i < danma.length; i++) danmaSet[danma[i]] = true;
  var tuomaPool = [];
  for (var i = 0; i < fused.length && tuomaPool.length < 6; i++) {
    if (!danmaSet[fused[i].num]) {
      tuomaPool.push(fused[i].num);
    }
  }

  // 生成3组方案
  var recommendations = [];
  for (var set = 0; set < 3; set++) {
    var tuomaOffset = set;
    var picks = danma.slice();
    for (var i = tuomaOffset; i < tuomaOffset + 3 && i < tuomaPool.length; i++) {
      picks.push(tuomaPool[i]);
    }
    picks.sort(function(a, b) { return a - b; });

    recommendations.push({
      picks: picks,
      danma: danma.slice(),
      tuoma: picks.filter(function(n) { return danmaSet[n] ? false : true; }),
      topScore: fused[0],
      scores: fused.slice(0, 10),
      avgScore: avgScore
    });
  }

  // 为每个号码生成选号理由
  var allPickedNums = [];
  for (var i = 0; i < recommendations.length; i++) {
    for (var j = 0; j < recommendations[i].picks.length; j++) {
      if (allPickedNums.indexOf(recommendations[i].picks[j]) < 0) {
        allPickedNums.push(recommendations[i].picks[j]);
      }
    }
  }

  // 为每个号码生成理由
  var reasonMap = {};
  for (var i = 0; i < allPickedNums.length; i++) {
    var n = allPickedNums[i];
    var scoreData = null;
    for (var j = 0; j < fused.length; j++) {
      if (fused[j].num === n) { scoreData = fused[j]; break; }
    }
    reasonMap[n] = analyzeNumberReason(n, allNums, lastDraw, scoreData || {}, 9, false);
  }

  // 将理由添加到每个推荐中
  for (var i = 0; i < recommendations.length; i++) {
    recommendations[i].reasons = {};
    for (var j = 0; j < recommendations[i].picks.length; j++) {
      recommendations[i].reasons[recommendations[i].picks[j]] = reasonMap[recommendations[i].picks[j]];
    }
  }

  return recommendations;
}

// ==================== 号码理由分析 ====================
/**
 * 分析号码的选号理由
 * @param {number} num - 号码
 * @param {array} history - 历史数据数组（每期是一个数字数组）
 * @param {number} lastDraw - 上期开奖号码数组
 * @param {object} scoreData - 该号码的评分数据 {markov, cooc, pos, trend, score}
 * @param {number} poolSize - 号码池大小（大乐透35，双色球33，排列三/五9）
 * @param {boolean} usePad - 是否补零（大乐透/双色球/快乐8 true，排列三/五 false）
 * @returns {string} 选号理由文字
 */
function analyzeNumberReason(num, history, lastDraw, scoreData, poolSize, usePad) {
  var reasons = [];
  var numStr = usePad ? pad(num) : ('' + num);

  // 1. 重号检测：上期是否出现
  if (lastDraw.indexOf(num) >= 0) {
    reasons.push('重号（上期开出）');
  }

  // 2. 斜连检测：与上期号码差值在1-3之间
  for (var i = 0; i < lastDraw.length; i++) {
    var diff = Math.abs(num - lastDraw[i]);
    if (diff >= 1 && diff <= 3) {
      var lastStr = usePad ? pad(lastDraw[i]) : ('' + lastDraw[i]);
      reasons.push('斜连（与上期' + lastStr + '差' + diff + '）');
      break;
    }
  }

  // 3. 邻号检测：与上期号码差1
  for (var i = 0; i < lastDraw.length; i++) {
    if (Math.abs(num - lastDraw[i]) === 1) {
      var lastStr2 = usePad ? pad(lastDraw[i]) : ('' + lastDraw[i]);
      reasons.push('邻号（与上期' + lastStr2 + '相邻）');
      break;
    }
  }

  // 4. 冷热号分析
  var recentCount = 0;
  var halfLen = Math.min(10, Math.floor(history.length / 2));
  if (halfLen < 1) halfLen = 1;
  for (var i = 0; i < halfLen; i++) {
    if (history[i].indexOf(num) >= 0) recentCount++;
  }
  var recentRate = recentCount / halfLen;

  if (recentRate >= 0.5) {
    reasons.push('热号（近' + halfLen + '期出现' + recentCount + '次）');
  } else if (recentRate >= 0.3) {
    reasons.push('温号（近' + halfLen + '期出现' + recentCount + '次）');
  } else if (recentCount === 0) {
    reasons.push('冷号（近' + halfLen + '期未出现，回补预期）');
  } else {
    reasons.push('温冷号（近' + halfLen + '期出现' + recentCount + '次）');
  }

  // 5. 遗漏回补检测
  var missPeriods = 0;
  for (var i = 0; i < history.length; i++) {
    if (history[i].indexOf(num) >= 0) break;
    missPeriods++;
  }
  if (missPeriods >= 5) {
    reasons.push('遗漏' + missPeriods + '期，回补信号强');
  } else if (missPeriods >= 3) {
    reasons.push('遗漏' + missPeriods + '期，有回补趋势');
  }

  // 6. 转移概率高
  if (scoreData.markov > 1.0) {
    reasons.push('转移概率高（上期关联号码后常出）');
  }

  // 7. 共现关联强
  if (scoreData.cooc > 5) {
    reasons.push('与上期号码共现频率高');
  }

  // 8. 趋势动量
  if (scoreData.trend > 0.15) {
    reasons.push('上升动量（近期出现频率增加）');
  } else if (scoreData.trend < -0.05) {
    reasons.push('下降趋势（近期频率降低，可能反弹）');
  }

  // 9. 位置模式
  if (scoreData.pos > 0.3) {
    reasons.push('位置吻合度高');
  }

  if (reasons.length === 0) {
    reasons.push('综合评分较高');
  }

  return reasons.slice(0, 3).join('；'); // 最多显示3条理由
}

// ==================== 渲染智能推荐结果（胆拖模式） ====================
function renderSmartRecommendations() {
  // 胆拖模式说明HTML（通用）
  function danmaExplainHTML() {
    var h = '';
    h += '<div style="margin-bottom:0.75rem;padding:0.5rem;background:var(--bg2);border-radius:8px;border-left:3px solid var(--accent)">';
    h += '<div style="font-weight:700;font-size:0.85rem;margin-bottom:0.25rem">胆拖模式说明</div>';
    h += '<div style="font-size:0.78rem;color:var(--muted)">';
    h += '<span class="ball gold" style="display:inline-block;width:22px;height:22px;font-size:0.7rem;line-height:22px">金</span> = 胆码（AI高置信度必选）&nbsp;&nbsp;';
    h += '<span class="ball red" style="display:inline-block;width:22px;height:22px;font-size:0.7rem;line-height:22px">红</span> = 拖码（候选号码）';
    h += '</div></div>';
    return h;
  }

  // AI分析面板HTML
  function aiAnalysisHTML(scores) {
    var h = '';
    h += '<div style="margin-top:0.5rem;font-size:0.75rem;color:var(--muted);background:var(--bg3);border:1px solid var(--rule);border-radius:6px;padding:0.5rem">';
    h += '<div style="font-weight:700;margin-bottom:0.3rem;color:var(--accent)">AI模型分析</div>';
    var topNums = scores.slice(0, 5);
    for (var k = 0; k < topNums.length; k++) {
      var s = topNums[k];
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.15rem">';
      h += '<span>号码 ' + pad(s.num) + '</span>';
      h += '<span style="color:var(--muted)">转移:' + s.markov.toFixed(2) + ' 关联:' + s.cooc.toFixed(2) + ' 位置:' + s.pos.toFixed(2) + ' 动量:' + s.trend.toFixed(2) + ' 融合:' + s.score.toFixed(4) + '</span>';
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  // 大乐透
  if (typeof dltSampleHistory !== 'undefined' && dltSampleHistory.length > 0) {
    var lastParts = dltSampleHistory[0].split('|');
    var lastDraw = { front: lastParts[0].split(',').map(Number), back: lastParts[1].split(',').map(Number) };
    var recs = smartRecommendDLT(dltSampleHistory, lastDraw);

    var html = '<div style="margin-bottom:0.5rem;color:var(--muted);font-size:0.82rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合（胆拖模式）</div>';
    html += danmaExplainHTML();

    for (var i = 0; i < recs.length; i++) {
      html += '<div style="margin-bottom:1rem">';
      html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">智能方案 ' + (i + 1) + '</div>';
      html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">前区 胆码: ';
      for (var j = 0; j < recs[i].danma.length; j++) {
        html += '<span style="font-weight:700">' + pad(recs[i].danma[j]) + '</span>';
        if (j < recs[i].danma.length - 1) html += ', ';
      }
      html += ' | 拖码: ';
      for (var j = 0; j < recs[i].tuoma.length; j++) {
        html += pad(recs[i].tuoma[j]);
        if (j < recs[i].tuoma.length - 1) html += ', ';
      }
      html += '</div>';
      html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">后区 胆码: ' + pad(recs[i].backDan) + ' | 拖码: ';
      for (var j = 0; j < recs[i].backTuoma.length; j++) {
        html += pad(recs[i].backTuoma[j]);
        if (j < recs[i].backTuoma.length - 1) html += ', ';
      }
      html += '</div>';
      html += '<div class="ball-row">';
      for (var j = 0; j < recs[i].front.length; j++) {
        var isDan = recs[i].danma.indexOf(recs[i].front[j]) >= 0;
        html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '">' + pad(recs[i].front[j]) + '</div>';
      }
      html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
      for (var j = 0; j < recs[i].back.length; j++) {
        var isBackDan = recs[i].back[j] === recs[i].backDan;
        html += '<div class="ball ' + (isBackDan ? 'gold' : 'blue') + '">' + pad(recs[i].back[j]) + '</div>';
      }
      html += '</div>';

      // 选号理由（仅第一组方案显示完整理由）
      if (i === 0) {
        html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
        html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
        for (var j = 0; j < recs[i].front.length; j++) {
          var n = recs[i].front[j];
          var isDan = recs[i].danma.indexOf(n) >= 0;
          var reason = recs[i].reasons[n] || '综合评分较高';
          html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDan ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(n) + '</span>' + reason + '</div>';
        }
        for (var j = 0; j < recs[i].back.length; j++) {
          var n = recs[i].back[j];
          var isBackDan = n === recs[i].backDan;
          var reason = recs[i].backReasons[n] || '综合评分较高';
          html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isBackDan ? 'gold' : 'blue') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(n) + '</span>后区 ' + reason + '</div>';
        }
        html += '</div>';
      }

      html += aiAnalysisHTML(recs[i].scores);
      html += '</div>';
    }

    var el = document.getElementById('dlt-smart-recommend');
    if (el) el.innerHTML = html;
  }

  // 双色球
  if (typeof ssqSampleHistory !== 'undefined' && ssqSampleHistory.length > 0) {
    var lastParts = ssqSampleHistory[0].split('|');
    var lastDraw = { red: lastParts[0].split(',').map(Number), blue: parseInt(lastParts[1], 10) };
    var recs = smartRecommendSSQ(ssqSampleHistory, lastDraw);

    var html = '<div style="margin-bottom:0.5rem;color:var(--muted);font-size:0.82rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合（胆拖模式）</div>';
    html += danmaExplainHTML();

    for (var i = 0; i < recs.length; i++) {
      html += '<div style="margin-bottom:1rem">';
      html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">智能方案 ' + (i + 1) + '</div>';
      html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">胆码: ';
      for (var j = 0; j < recs[i].danma.length; j++) {
        html += '<span style="font-weight:700">' + pad(recs[i].danma[j]) + '</span>';
        if (j < recs[i].danma.length - 1) html += ', ';
      }
      html += ' | 拖码: ';
      for (var j = 0; j < recs[i].tuoma.length; j++) {
        html += pad(recs[i].tuoma[j]);
        if (j < recs[i].tuoma.length - 1) html += ', ';
      }
      html += '</div>';
      html += '<div class="ball-row">';
      for (var j = 0; j < recs[i].red.length; j++) {
        var isDan = recs[i].danma.indexOf(recs[i].red[j]) >= 0;
        html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '">' + pad(recs[i].red[j]) + '</div>';
      }
      html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
      html += '<div class="ball blue">' + pad(recs[i].blue) + '</div>';
      html += '</div>';

      // 选号理由（仅第一组方案显示完整理由）
      if (i === 0) {
        html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
        html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
        for (var j = 0; j < recs[i].red.length; j++) {
          var n = recs[i].red[j];
          var isDan = recs[i].danma.indexOf(n) >= 0;
          var reason = recs[i].reasons[n] || '综合评分较高';
          html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDan ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(n) + '</span>' + reason + '</div>';
        }
        var blueReason = recs[i].blueReason || '综合评分较高';
        html += '<div style="margin-bottom:0.15rem"><span class="ball blue" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(recs[i].blue) + '</span>蓝球 ' + blueReason + '</div>';
        html += '</div>';
      }

      html += aiAnalysisHTML(recs[i].scores);
      html += '</div>';
    }

    var el = document.getElementById('ssq-smart-recommend');
    if (el) el.innerHTML = html;
  }

  // 快乐8
  if (typeof kl8SampleHistory !== 'undefined' && kl8SampleHistory.length > 0) {
    var lastDraw = kl8SampleHistory[0].split(',').map(Number).sort(function(a, b) { return a - b; });
    var recs = smartRecommendKL8(kl8SampleHistory, lastDraw);

    var html = '<div style="margin-bottom:0.5rem;color:var(--muted);font-size:0.82rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合（胆拖模式）</div>';
    html += danmaExplainHTML();

    for (var i = 0; i < recs.length; i++) {
      html += '<div style="margin-bottom:1rem">';
      html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">智能方案 ' + (i + 1) + '（选10）</div>';
      html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">胆码: ';
      for (var j = 0; j < recs[i].danma.length; j++) {
        html += '<span style="font-weight:700">' + pad(recs[i].danma[j]) + '</span>';
        if (j < recs[i].danma.length - 1) html += ', ';
      }
      html += ' | 拖码: ';
      for (var j = 0; j < recs[i].tuoma.length; j++) {
        html += pad(recs[i].tuoma[j]);
        if (j < recs[i].tuoma.length - 1) html += ', ';
      }
      html += '</div>';
      html += '<div class="ball-row">';
      for (var j = 0; j < recs[i].picks.length; j++) {
        var isDan = recs[i].danma.indexOf(recs[i].picks[j]) >= 0;
        html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '" style="width:36px;height:36px;font-size:0.75rem">' + pad(recs[i].picks[j]) + '</div>';
      }
      html += '</div>';

      // 选号理由（仅第一组方案显示完整理由）
      if (i === 0) {
        html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
        html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
        for (var j = 0; j < recs[i].picks.length; j++) {
          var n = recs[i].picks[j];
          var isDan = recs[i].danma.indexOf(n) >= 0;
          var reason = recs[i].reasons[n] || '综合评分较高';
          html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDan ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(n) + '</span>' + reason + '</div>';
        }
        html += '</div>';
      }

      html += aiAnalysisHTML(recs[i].scores);
      html += '</div>';
    }

    var el = document.getElementById('kl8-smart-recommend');
    if (el) el.innerHTML = html;
  }

  // 排列三
  if (typeof PL3_HISTORY !== 'undefined' && PL3_HISTORY.length > 0) {
    var lastDraw = PL3_HISTORY[0].numbers;
    var recs = smartRecommendPL3(PL3_HISTORY, lastDraw);

    var html = '<div style="margin-bottom:0.5rem;color:var(--muted);font-size:0.82rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合（胆拖模式）</div>';
    html += danmaExplainHTML();

    for (var i = 0; i < recs.length; i++) {
      html += '<div style="margin-bottom:1rem">';
      html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">智能方案 ' + (i + 1) + '</div>';
      html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">胆码: ';
      for (var j = 0; j < recs[i].danma.length; j++) {
        html += '<span style="font-weight:700">' + recs[i].danma[j] + '</span>';
        if (j < recs[i].danma.length - 1) html += ', ';
      }
      html += ' | 拖码: ';
      for (var j = 0; j < recs[i].tuoma.length; j++) {
        html += recs[i].tuoma[j];
        if (j < recs[i].tuoma.length - 1) html += ', ';
      }
      html += '</div>';
      html += '<div class="ball-row">';
      for (var j = 0; j < recs[i].picks.length; j++) {
        var isDan = recs[i].danma.indexOf(recs[i].picks[j]) >= 0;
        html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '">' + recs[i].picks[j] + '</div>';
      }
      html += '</div>';

      // 选号理由（仅第一组方案显示完整理由）
      if (i === 0) {
        html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
        html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
        for (var j = 0; j < recs[i].picks.length; j++) {
          var n = recs[i].picks[j];
          var isDan = recs[i].danma.indexOf(n) >= 0;
          var reason = recs[i].reasons[n] || '综合评分较高';
          html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDan ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + n + '</span>' + reason + '</div>';
        }
        html += '</div>';
      }

      html += aiAnalysisHTML(recs[i].scores);
      html += '</div>';
    }

    var el = document.getElementById('pl3-smart-recommend');
    if (el) el.innerHTML = html;
  }

  // 排列五
  if (typeof PL5_HISTORY !== 'undefined' && PL5_HISTORY.length > 0) {
    var lastDraw = PL5_HISTORY[0].numbers;
    var recs = smartRecommendPL5(PL5_HISTORY, lastDraw);

    var html = '<div style="margin-bottom:0.5rem;color:var(--muted);font-size:0.82rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合（胆拖模式）</div>';
    html += danmaExplainHTML();

    for (var i = 0; i < recs.length; i++) {
      html += '<div style="margin-bottom:1rem">';
      html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">智能方案 ' + (i + 1) + '</div>';
      html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">胆码: ';
      for (var j = 0; j < recs[i].danma.length; j++) {
        html += '<span style="font-weight:700">' + recs[i].danma[j] + '</span>';
        if (j < recs[i].danma.length - 1) html += ', ';
      }
      html += ' | 拖码: ';
      for (var j = 0; j < recs[i].tuoma.length; j++) {
        html += recs[i].tuoma[j];
        if (j < recs[i].tuoma.length - 1) html += ', ';
      }
      html += '</div>';
      html += '<div class="ball-row">';
      for (var j = 0; j < recs[i].picks.length; j++) {
        var isDan = recs[i].danma.indexOf(recs[i].picks[j]) >= 0;
        html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '">' + recs[i].picks[j] + '</div>';
      }
      html += '</div>';

      // 选号理由（仅第一组方案显示完整理由）
      if (i === 0) {
        html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
        html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
        for (var j = 0; j < recs[i].picks.length; j++) {
          var n = recs[i].picks[j];
          var isDan = recs[i].danma.indexOf(n) >= 0;
          var reason = recs[i].reasons[n] || '综合评分较高';
          html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDan ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + n + '</span>' + reason + '</div>';
        }
        html += '</div>';
      }

      html += aiAnalysisHTML(recs[i].scores);
      html += '</div>';
    }

    var el = document.getElementById('pl5-smart-recommend');
    if (el) el.innerHTML = html;
  }
}

// ==================== 保留原有自动复盘函数（供兼容） ====================

function autoReviewDLT() {
  if (typeof dltSampleHistory === 'undefined' || dltSampleHistory.length < 10) return;

  var actualDraw = dltSampleHistory[0];
  var actualParts = actualDraw.split('|');
  var actualFront = actualParts[0].split(',').map(Number);
  var actualBack = actualParts[1].split(',').map(Number);

  var simHistory = dltSampleHistory.slice(1);
  var simAllFronts = [];
  var simAllBacks = [];
  for (var i = 0; i < simHistory.length; i++) {
    var parts = simHistory[i].split('|');
    simAllFronts.push(parts[0].split(',').map(Number));
    simAllBacks.push(parts[1].split(',').map(Number));
  }

  var simLast = { front: simAllFronts[0], back: simAllBacks[0] };

  var simScores = scoreDLTNumbers(simLast, simAllFronts, simAllBacks);
  var simBackScores = scoreDLTBackNumbers(simLast, simAllBacks);

  var simRecommendations = generateDLTSimPicks(simScores, simBackScores);

  var reviewResults = [];
  var bestHitRate = 0;
  var bestSetIdx = 0;

  for (var set = 0; set < 3; set++) {
    var frontHits = simRecommendations[set].front.filter(function(n) { return actualFront.indexOf(n) >= 0; });
    var backHits = simRecommendations[set].back.filter(function(n) { return actualBack.indexOf(n) >= 0; });
    var hitRate = (frontHits.length * 10 + backHits.length * 15);
    reviewResults.push({
      set: set + 1,
      front: simRecommendations[set].front,
      back: simRecommendations[set].back,
      frontHits: frontHits,
      backHits: backHits,
      hitRate: hitRate
    });
    if (hitRate > bestHitRate) {
      bestHitRate = hitRate;
      bestSetIdx = set;
    }
  }

  var optimizedWeights = optimizeDLTWeights(reviewResults, simScores);

  var fullFronts = [actualFront].concat(simAllFronts);
  var fullBacks = [actualBack].concat(simAllBacks);
  var optScores = scoreDLTNumbersOptimized({ front: actualFront, back: actualBack }, fullFronts, fullBacks, optimizedWeights);
  var optBackScores = scoreDLTBackNumbersOptimized({ front: actualFront, back: actualBack }, fullBacks, optimizedWeights);

  renderAutoReviewDLT(reviewResults, optimizedWeights, optScores, optBackScores, actualFront, actualBack);
}

function generateDLTSimPicks(scores, backScores) {
  var sorted = scores.slice().sort(function(a, b) { return b.total - a.total; });
  var sortedBack = backScores.slice().sort(function(a, b) { return b.total - a.total; });
  var recommendations = [];

  for (var set = 0; set < 3; set++) {
    var frontPicks = [];
    var usedNums = {};

    frontPicks.push(sorted[set].num);
    usedNums[sorted[set].num] = true;

    var zoneCounts = [0, 0, 0];
    var firstZone = frontPicks[0] <= 12 ? 0 : frontPicks[0] <= 23 ? 1 : 2;
    zoneCounts[firstZone]++;

    for (var i = 0; i < sorted.length && frontPicks.length < 5; i++) {
      var n = sorted[i].num;
      if (usedNums[n]) continue;
      var z = n <= 12 ? 0 : n <= 23 ? 1 : 2;
      if (zoneCounts[z] < 3) {
        frontPicks.push(n);
        usedNums[n] = true;
        zoneCounts[z]++;
      }
    }
    for (var i = 0; i < sorted.length && frontPicks.length < 5; i++) {
      if (!usedNums[sorted[i].num]) {
        frontPicks.push(sorted[i].num);
        usedNums[sorted[i].num] = true;
      }
    }
    frontPicks.sort(function(a, b) { return a - b; });

    var backPicks = [sortedBack[set].num, sortedBack[(set + 1) % sortedBack.length].num].sort(function(a, b) { return a - b; });
    recommendations.push({ front: frontPicks, back: backPicks });
  }
  return recommendations;
}

function optimizeDLTWeights(reviewResults, simScores) {
  var weights = {
    freq: 25,
    miss: 20,
    repeat: 15,
    zone: 15,
    adj: 5,
    tail: 3,
    oddEven: 2
  };

  var hitNums = [];
  for (var set = 0; set < reviewResults.length; set++) {
    hitNums = hitNums.concat(reviewResults[set].frontHits);
  }
  hitNums = unique(hitNums);

  var freqHitCount = 0, missHitCount = 0, repeatHitCount = 0, zoneHitCount = 0;

  for (var i = 0; i < hitNums.length; i++) {
    var n = hitNums[i];
    var scoreData = null;
    for (var j = 0; j < simScores.length; j++) {
      if (simScores[j].num === n) { scoreData = simScores[j]; break; }
    }
    if (!scoreData) continue;

    if (scoreData.freqScore >= 20) freqHitCount++;
    if (scoreData.missScore >= 15) missHitCount++;
    if (scoreData.repeatScore >= 10) repeatHitCount++;
    if (scoreData.zoneScore >= 10) zoneHitCount++;
  }

  var totalHits = Math.max(1, hitNums.length);

  if (freqHitCount / totalHits > 0.5) weights.freq = Math.min(35, weights.freq + 5);
  else weights.freq = Math.max(15, weights.freq - 3);

  if (missHitCount / totalHits > 0.4) weights.miss = Math.min(30, weights.miss + 5);
  else weights.miss = Math.max(10, weights.miss - 3);

  if (repeatHitCount / totalHits > 0.3) weights.repeat = Math.min(25, weights.repeat + 5);
  else weights.repeat = Math.max(8, weights.repeat - 3);

  if (zoneHitCount / totalHits > 0.4) weights.zone = Math.min(25, weights.zone + 5);
  else weights.zone = Math.max(8, weights.zone - 3);

  return weights;
}

function scoreDLTNumbersOptimized(last, allFronts, allBacks, w) {
  var totalPeriods = allFronts.length;
  var expected = (5 / 35) * totalPeriods;
  var scores = [];

  for (var n = 1; n <= 35; n++) {
    var score = { num: n, freqScore: 0, missScore: 0, repeatScore: 0, zoneScore: 0, total: 0, reasons: [] };

    var freq = 0;
    for (var i = 0; i < allFronts.length; i++) {
      if (allFronts[i].indexOf(n) >= 0) freq++;
    }
    score.freqScore = Math.min(w.freq, (freq / expected) * w.freq);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');
    else if (freq >= expected * 1.0) score.reasons.push('温号稳定');

    var miss = 0;
    for (var i = 0; i < allFronts.length; i++) {
      if (allFronts[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === allFronts.length) miss = allFronts.length;
    var avgMiss = Math.round(35 / 5);
    if (miss >= avgMiss * 0.8 && miss <= avgMiss * 2) {
      score.missScore = w.miss * (miss / avgMiss);
      if (miss >= avgMiss) score.reasons.push('遗漏回补号');
    } else if (miss > avgMiss * 2) {
      score.missScore = w.miss * 0.4;
      score.reasons.push('超长遗漏');
    } else {
      score.missScore = w.miss * 0.5;
    }

    if (last.front.indexOf(n) >= 0) {
      score.repeatScore = w.repeat;
      score.reasons.push('上期重号候选');
    } else {
      for (var i = 0; i < last.front.length; i++) {
        if (Math.abs(n - last.front[i]) === 1) {
          score.repeatScore = w.repeat * 0.5;
          score.reasons.push('连号关联');
          break;
        }
      }
    }

    var zoneIdx = n <= 12 ? 0 : n <= 23 ? 1 : 2;
    var recentZoneCounts = [0, 0, 0];
    var recentN = Math.min(5, allFronts.length);
    for (var i = 0; i < recentN; i++) {
      for (var j = 0; j < allFronts[i].length; j++) {
        var zn = allFronts[i][j] <= 12 ? 0 : allFronts[i][j] <= 23 ? 1 : 2;
        recentZoneCounts[zn]++;
      }
    }
    var zoneAvg = recentZoneCounts[zoneIdx] / recentN;
    if (zoneAvg < 1.5) {
      score.zoneScore = w.zone;
      score.reasons.push('区间回补');
    } else if (zoneAvg < 1.8) {
      score.zoneScore = w.zone * 0.67;
    } else {
      score.zoneScore = w.zone * 0.33;
    }

    score.total = score.freqScore + score.missScore + score.repeatScore + score.zoneScore + w.adj + w.tail + w.oddEven;
    scores.push(score);
  }

  return scores;
}

function scoreDLTBackNumbersOptimized(last, allBacks, w) {
  var totalPeriods = allBacks.length;
  var expected = (2 / 12) * totalPeriods;
  var scores = [];

  for (var n = 1; n <= 12; n++) {
    var score = { num: n, total: 0, reasons: [] };

    var freq = 0;
    for (var i = 0; i < allBacks.length; i++) {
      if (allBacks[i].indexOf(n) >= 0) freq++;
    }
    var freqScore = Math.min(40, (freq / expected) * 40);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');

    var miss = 0;
    for (var i = 0; i < allBacks.length; i++) {
      if (allBacks[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === allBacks.length) miss = allBacks.length;
    var missScore = Math.min(30, miss * 3);
    if (miss >= 4) score.reasons.push('遗漏回补');

    var repeatScore = 0;
    if (last.back.indexOf(n) >= 0) {
      repeatScore = 20;
      score.reasons.push('上期重号');
    }

    score.total = freqScore + missScore + repeatScore;
    scores.push(score);
  }

  return scores;
}

function renderAutoReviewDLT(reviewResults, weights, optScores, optBackScores, actualFront, actualBack) {
  var card = document.getElementById('dlt-auto-review-card');
  var container = document.getElementById('dlt-auto-review');
  if (!card || !container) return;

  card.style.display = 'block';

  var html = '';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">实际开奖号码（最新一期）</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < actualFront.length; i++) {
    html += '<div class="ball red">' + pad(actualFront[i]) + '</div>';
  }
  html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
  for (var i = 0; i < actualBack.length; i++) {
    html += '<div class="ball blue">' + pad(actualBack[i]) + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem">模拟推荐 vs 实际开奖对比</div>';

  for (var set = 0; set < reviewResults.length; set++) {
    var r = reviewResults[set];
    var hitColor = r.hitRate >= 50 ? 'var(--accent3)' : r.hitRate >= 20 ? 'var(--accent)' : 'var(--muted)';
    html += '<div style="background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem;margin-bottom:0.5rem">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem">';
    html += '<span style="color:var(--muted);font-size:0.82rem">模拟方案 ' + r.set + '</span>';
    html += '<span style="color:' + hitColor + ';font-weight:700;font-size:0.85rem">得分 ' + r.hitRate + '</span>';
    html += '</div>';
    html += '<div class="ball-row" style="margin-bottom:0.25rem">';
    for (var i = 0; i < r.front.length; i++) {
      var isHit = r.frontHits.indexOf(r.front[i]) >= 0;
      html += '<div class="ball ' + (isHit ? 'gold' : 'gray') + '">' + pad(r.front[i]) + '</div>';
    }
    html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
    for (var i = 0; i < r.back.length; i++) {
      var isHit = r.backHits.indexOf(r.back[i]) >= 0;
      html += '<div class="ball ' + (isHit ? 'gold' : 'gray') + '">' + pad(r.back[i]) + '</div>';
    }
    html += '</div>';
    var hitDesc = [];
    if (r.frontHits.length > 0) hitDesc.push('前区命中' + r.frontHits.length + '个');
    if (r.backHits.length > 0) hitDesc.push('后区命中' + r.backHits.length + '个');
    if (hitDesc.length === 0) hitDesc.push('未命中');
    html += '<div style="font-size:0.75rem;color:var(--muted)">' + hitDesc.join('，') + '</div>';
    html += '</div>';
  }
  html += '</div>';

  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem">权重优化详情</div>';
  var baseWeights = { freq: 25, miss: 20, repeat: 15, zone: 15, adj: 5, tail: 3, oddEven: 2 };
  var weightLabels = { freq: '频率', miss: '遗漏', repeat: '重号', zone: '区间', adj: '连号', tail: '尾数', oddEven: '奇偶' };
  html += '<div class="stat-grid">';
  for (var key in weights) {
    var diff = weights[key] - baseWeights[key];
    var diffStr = diff > 0 ? '<span style="color:var(--accent3)">+' + diff + '</span>' : diff < 0 ? '<span style="color:var(--accent4)">' + diff + '</span>' : '<span style="color:var(--muted)">0</span>';
    html += '<div class="stat-item">';
    html += '<div class="stat-value" style="font-size:1.1rem">' + weights[key] + ' ' + diffStr + '</div>';
    html += '<div class="stat-label">' + weightLabels[key] + '权重</div>';
    html += '</div>';
  }
  html += '</div></div>';

  // 优化后精准推荐：使用5层AI引擎（与综合推荐算法完全不同）
  var lastParts2 = dltSampleHistory[0].split('|');
  var lastDraw2 = { front: lastParts2[0].split(',').map(Number), back: lastParts2[1].split(',').map(Number) };
  var smartRecs = smartRecommendDLT(dltSampleHistory, lastDraw2);

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:0.5rem">优化后精准推荐（AI五层融合引擎）</div>';
  html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.75rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合，与综合推荐采用不同算法</div>';

  for (var si = 0; si < smartRecs.length; si++) {
    var sr = smartRecs[si];
    html += '<div style="margin-bottom:1rem;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">优化方案 ' + (si + 1) + '</div>';
    html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">前区 胆码: ';
    for (var j = 0; j < sr.danma.length; j++) {
      html += '<span style="font-weight:700">' + pad(sr.danma[j]) + '</span>';
      if (j < sr.danma.length - 1) html += ', ';
    }
    html += ' | 拖码: ';
    for (var j = 0; j < sr.tuoma.length; j++) {
      html += pad(sr.tuoma[j]);
      if (j < sr.tuoma.length - 1) html += ', ';
    }
    html += '</div>';
    html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">后区 胆码: ' + pad(sr.backDan) + ' | 拖码: ';
    for (var j = 0; j < sr.backTuoma.length; j++) {
      html += pad(sr.backTuoma[j]);
      if (j < sr.backTuoma.length - 1) html += ', ';
    }
    html += '</div>';
    html += '<div class="ball-row">';
    for (var j = 0; j < sr.front.length; j++) {
      var isDan = sr.danma.indexOf(sr.front[j]) >= 0;
      html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '">' + pad(sr.front[j]) + '</div>';
    }
    html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
    for (var j = 0; j < sr.back.length; j++) {
      var isBackDan = sr.back[j] === sr.backDan;
      html += '<div class="ball ' + (isBackDan ? 'gold' : 'blue') + '">' + pad(sr.back[j]) + '</div>';
    }
    html += '</div>';

    // 选号理由（仅第一组显示）
    if (si === 0) {
      html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
      html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
      for (var j = 0; j < sr.front.length; j++) {
        var n = sr.front[j];
        var isDanR = sr.danma.indexOf(n) >= 0;
        var reason = sr.reasons[n] || '综合评分较高';
        html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDanR ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(n) + '</span>' + reason + '</div>';
      }
      for (var j = 0; j < sr.back.length; j++) {
        var bn = sr.back[j];
        var isBDR = bn === sr.backDan;
        var bReason = sr.backReasons[bn] || '综合评分较高';
        html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isBDR ? 'gold' : 'blue') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(bn) + '</span>后区 ' + bReason + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="disclaimer"><strong>声明：</strong>自动复盘与优化基于历史数据统计分析，权重调整仅供参考。彩票开奖为随机事件，优化后的推荐不构成投注建议。</div>';

  container.innerHTML = html;
}

// ==================== 双色球自动复盘 ====================

function autoReviewSSQ() {
  if (typeof ssqSampleHistory === 'undefined' || ssqSampleHistory.length < 10) return;

  var actualDraw = ssqSampleHistory[0];
  var actualParts = actualDraw.split('|');
  var actualRed = actualParts[0].split(',').map(Number);
  var actualBlue = parseInt(actualParts[1], 10);

  var simHistory = ssqSampleHistory.slice(1);
  var simAllReds = [];
  var simAllBlues = [];
  for (var i = 0; i < simHistory.length; i++) {
    var parts = simHistory[i].split('|');
    simAllReds.push(parts[0].split(',').map(Number));
    simAllBlues.push(parseInt(parts[1], 10));
  }

  var simLast = { red: simAllReds[0], blue: simAllBlues[0] };

  var simScores = scoreSSQNumbers(simLast, simAllReds);
  var simBackScores = scoreSSQBlueNumbers(simLast, simAllBlues);

  var simRecommendations = generateSSQSimPicks(simScores, simBackScores);

  var reviewResults = [];
  var bestHitRate = 0;

  for (var set = 0; set < 3; set++) {
    var redHits = simRecommendations[set].red.filter(function(n) { return actualRed.indexOf(n) >= 0; });
    var blueHit = simRecommendations[set].blue === actualBlue;
    var hitRate = (redHits.length * 10 + (blueHit ? 15 : 0));
    reviewResults.push({
      set: set + 1,
      red: simRecommendations[set].red,
      blue: simRecommendations[set].blue,
      redHits: redHits,
      blueHit: blueHit,
      hitRate: hitRate
    });
    if (hitRate > bestHitRate) bestHitRate = hitRate;
  }

  var optimizedWeights = optimizeSSQWeights(reviewResults, simScores);

  var fullReds = [actualRed].concat(simAllReds);
  var fullBlues = [actualBlue].concat(simAllBlues);
  var optScores = scoreSSQNumbersOptimized({ red: actualRed, blue: actualBlue }, fullReds, optimizedWeights);
  var optBackScores = scoreSSQBlueNumbersOptimized({ red: actualRed, blue: actualBlue }, fullBlues, optimizedWeights);

  renderAutoReviewSSQ(reviewResults, optimizedWeights, optScores, optBackScores, actualRed, actualBlue);
}

function generateSSQSimPicks(scores, backScores) {
  var sorted = scores.slice().sort(function(a, b) { return b.total - a.total; });
  var sortedBack = backScores.slice().sort(function(a, b) { return b.total - a.total; });
  var recommendations = [];

  for (var set = 0; set < 3; set++) {
    var redPicks = [];
    var usedNums = {};
    redPicks.push(sorted[set].num);
    usedNums[sorted[set].num] = true;
    var zoneCounts = [0, 0, 0];
    var firstZone = redPicks[0] <= 11 ? 0 : redPicks[0] <= 22 ? 1 : 2;
    zoneCounts[firstZone]++;
    for (var i = 0; i < sorted.length && redPicks.length < 6; i++) {
      var n = sorted[i].num;
      if (usedNums[n]) continue;
      var z = n <= 11 ? 0 : n <= 22 ? 1 : 2;
      if (zoneCounts[z] < 3) {
        redPicks.push(n);
        usedNums[n] = true;
        zoneCounts[z]++;
      }
    }
    for (var i = 0; i < sorted.length && redPicks.length < 6; i++) {
      if (!usedNums[sorted[i].num]) {
        redPicks.push(sorted[i].num);
        usedNums[sorted[i].num] = true;
      }
    }
    redPicks.sort(function(a, b) { return a - b; });
    var bluePick = sortedBack[set].num;
    recommendations.push({ red: redPicks, blue: bluePick });
  }
  return recommendations;
}

function optimizeSSQWeights(reviewResults, simScores) {
  var weights = { freq: 25, miss: 20, repeat: 15, zone: 15, adj: 5, tail: 3, oddEven: 2 };

  var hitNums = [];
  for (var set = 0; set < reviewResults.length; set++) {
    hitNums = hitNums.concat(reviewResults[set].redHits);
  }
  hitNums = unique(hitNums);

  var freqHitCount = 0, missHitCount = 0, repeatHitCount = 0, zoneHitCount = 0;
  for (var i = 0; i < hitNums.length; i++) {
    var n = hitNums[i];
    var scoreData = null;
    for (var j = 0; j < simScores.length; j++) {
      if (simScores[j].num === n) { scoreData = simScores[j]; break; }
    }
    if (!scoreData) continue;
    var totalScore = scoreData.total;
    if (totalScore >= 60) freqHitCount++;
    if (totalScore >= 50 && totalScore < 70) missHitCount++;
    if (totalScore >= 55) repeatHitCount++;
    if (totalScore >= 45) zoneHitCount++;
  }

  var totalHits = Math.max(1, hitNums.length);

  if (freqHitCount / totalHits > 0.5) weights.freq = Math.min(35, weights.freq + 5);
  else weights.freq = Math.max(15, weights.freq - 3);

  if (missHitCount / totalHits > 0.4) weights.miss = Math.min(30, weights.miss + 5);
  else weights.miss = Math.max(10, weights.miss - 3);

  if (repeatHitCount / totalHits > 0.3) weights.repeat = Math.min(25, weights.repeat + 5);
  else weights.repeat = Math.max(8, weights.repeat - 3);

  if (zoneHitCount / totalHits > 0.4) weights.zone = Math.min(25, weights.zone + 5);
  else weights.zone = Math.max(8, weights.zone - 3);

  return weights;
}

function scoreSSQNumbersOptimized(last, allReds, w) {
  var totalPeriods = allReds.length;
  var expected = (6 / 33) * totalPeriods;
  var scores = [];

  for (var n = 1; n <= 33; n++) {
    var score = { num: n, total: 0, reasons: [] };

    var freq = 0;
    for (var i = 0; i < allReds.length; i++) {
      if (allReds[i].indexOf(n) >= 0) freq++;
    }
    var freqScore = Math.min(w.freq, (freq / expected) * w.freq);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');
    else if (freq >= expected) score.reasons.push('温号稳定');

    var miss = 0;
    for (var i = 0; i < allReds.length; i++) {
      if (allReds[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === allReds.length) miss = allReds.length;
    var avgMiss = Math.round(33 / 6);
    var missScore = miss >= avgMiss * 0.8 && miss <= avgMiss * 2 ? Math.min(w.miss, (miss / avgMiss) * w.miss) : w.miss * 0.4;
    if (miss >= avgMiss) score.reasons.push('遗漏回补号');

    var repeatScore = 0;
    if (last.red.indexOf(n) >= 0) {
      repeatScore = w.repeat;
      score.reasons.push('上期重号候选');
    } else {
      for (var i = 0; i < last.red.length; i++) {
        if (Math.abs(n - last.red[i]) === 1) {
          repeatScore = w.repeat * 0.5;
          score.reasons.push('连号关联');
          break;
        }
      }
    }

    var zoneIdx = n <= 11 ? 0 : n <= 22 ? 1 : 2;
    var recentZoneCounts = [0, 0, 0];
    var recentN = Math.min(5, allReds.length);
    for (var i = 0; i < recentN; i++) {
      for (var j = 0; j < allReds[i].length; j++) {
        var zn = allReds[i][j] <= 11 ? 0 : allReds[i][j] <= 22 ? 1 : 2;
        recentZoneCounts[zn]++;
      }
    }
    var zoneAvg = recentZoneCounts[zoneIdx] / recentN;
    var zoneScore = zoneAvg < 1.5 ? w.zone : zoneAvg < 2 ? w.zone * 0.67 : w.zone * 0.33;
    if (zoneAvg < 1.5) score.reasons.push('区间回补');

    score.total = freqScore + missScore + repeatScore + zoneScore + w.adj + w.tail + w.oddEven;
    scores.push(score);
  }
  return scores;
}

function scoreSSQBlueNumbersOptimized(last, allBlues, w) {
  var totalPeriods = allBlues.length;
  var expected = (1 / 16) * totalPeriods;
  var scores = [];

  for (var n = 1; n <= 16; n++) {
    var score = { num: n, total: 0, reasons: [] };

    var freq = 0;
    for (var i = 0; i < allBlues.length; i++) {
      if (allBlues[i] === n) freq++;
    }
    score.total = Math.min(40, (freq / Math.max(1, expected)) * 40);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');

    var miss = 0;
    for (var i = 0; i < allBlues.length; i++) {
      if (allBlues[i] === n) break;
      miss++;
    }
    if (miss === allBlues.length) miss = allBlues.length;
    score.total += Math.min(30, miss * 3);
    if (miss >= 8) score.reasons.push('遗漏回补');

    if (last.blue === n) {
      score.total += 20;
      score.reasons.push('上期重号');
    }

    scores.push(score);
  }
  return scores;
}

function renderAutoReviewSSQ(reviewResults, weights, optScores, optBackScores, actualRed, actualBlue) {
  var card = document.getElementById('ssq-auto-review-card');
  var container = document.getElementById('ssq-auto-review');
  if (!card || !container) return;

  card.style.display = 'block';

  var html = '';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">实际开奖号码（最新一期）</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < actualRed.length; i++) {
    html += '<div class="ball red">' + pad(actualRed[i]) + '</div>';
  }
  html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
  html += '<div class="ball blue">' + pad(actualBlue) + '</div>';
  html += '</div></div>';

  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem">模拟推荐 vs 实际开奖对比</div>';

  for (var set = 0; set < reviewResults.length; set++) {
    var r = reviewResults[set];
    var hitColor = r.hitRate >= 50 ? 'var(--accent3)' : r.hitRate >= 20 ? 'var(--accent)' : 'var(--muted)';
    html += '<div style="background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem;margin-bottom:0.5rem">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem">';
    html += '<span style="color:var(--muted);font-size:0.82rem">模拟方案 ' + r.set + '</span>';
    html += '<span style="color:' + hitColor + ';font-weight:700;font-size:0.85rem">得分 ' + r.hitRate + '</span>';
    html += '</div>';
    html += '<div class="ball-row" style="margin-bottom:0.25rem">';
    for (var i = 0; i < r.red.length; i++) {
      var isHit = r.redHits.indexOf(r.red[i]) >= 0;
      html += '<div class="ball ' + (isHit ? 'gold' : 'gray') + '">' + pad(r.red[i]) + '</div>';
    }
    html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
    html += '<div class="ball ' + (r.blueHit ? 'gold' : 'gray') + '">' + pad(r.blue) + '</div>';
    html += '</div>';
    var hitDesc = [];
    if (r.redHits.length > 0) hitDesc.push('红球命中' + r.redHits.length + '个');
    if (r.blueHit) hitDesc.push('蓝球命中');
    if (hitDesc.length === 0) hitDesc.push('未命中');
    html += '<div style="font-size:0.75rem;color:var(--muted)">' + hitDesc.join('，') + '</div>';
    html += '</div>';
  }
  html += '</div>';

  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem">权重优化详情</div>';
  var baseWeights = { freq: 25, miss: 20, repeat: 15, zone: 15, adj: 5, tail: 3, oddEven: 2 };
  var weightLabels = { freq: '频率', miss: '遗漏', repeat: '重号', zone: '区间', adj: '连号', tail: '尾数', oddEven: '奇偶' };
  html += '<div class="stat-grid">';
  for (var key in weights) {
    var diff = weights[key] - baseWeights[key];
    var diffStr = diff > 0 ? '<span style="color:var(--accent3)">+' + diff + '</span>' : diff < 0 ? '<span style="color:var(--accent4)">' + diff + '</span>' : '<span style="color:var(--muted)">0</span>';
    html += '<div class="stat-item">';
    html += '<div class="stat-value" style="font-size:1.1rem">' + weights[key] + ' ' + diffStr + '</div>';
    html += '<div class="stat-label">' + weightLabels[key] + '权重</div>';
    html += '</div>';
  }
  html += '</div></div>';

  // 优化后精准推荐：使用5层AI引擎（与综合推荐算法完全不同）
  var lastParts2 = ssqSampleHistory[0].split('|');
  var lastDraw2 = { red: lastParts2[0].split(',').map(Number), blue: parseInt(lastParts2[1], 10) };
  var smartRecs = smartRecommendSSQ(ssqSampleHistory, lastDraw2);

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:0.5rem">优化后精准推荐（AI五层融合引擎）</div>';
  html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.75rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合，与综合推荐采用不同算法</div>';

  for (var si = 0; si < smartRecs.length; si++) {
    var sr = smartRecs[si];
    html += '<div style="margin-bottom:1rem;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">优化方案 ' + (si + 1) + '</div>';
    html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">胆码: ';
    for (var j = 0; j < sr.danma.length; j++) {
      html += '<span style="font-weight:700">' + pad(sr.danma[j]) + '</span>';
      if (j < sr.danma.length - 1) html += ', ';
    }
    html += ' | 拖码: ';
    for (var j = 0; j < sr.tuoma.length; j++) {
      html += pad(sr.tuoma[j]);
      if (j < sr.tuoma.length - 1) html += ', ';
    }
    html += '</div>';
    html += '<div class="ball-row">';
    for (var j = 0; j < sr.red.length; j++) {
      var isDan = sr.danma.indexOf(sr.red[j]) >= 0;
      html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '">' + pad(sr.red[j]) + '</div>';
    }
    html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
    html += '<div class="ball blue">' + pad(sr.blue) + '</div>';
    html += '</div>';

    // 选号理由（仅第一组显示）
    if (si === 0) {
      html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
      html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
      for (var j = 0; j < sr.red.length; j++) {
        var n = sr.red[j];
        var isDanR = sr.danma.indexOf(n) >= 0;
        var reason = sr.reasons[n] || '综合评分较高';
        html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDanR ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(n) + '</span>' + reason + '</div>';
      }
      var blueReason = sr.blueReason || '综合评分较高';
      html += '<div style="margin-bottom:0.15rem"><span class="ball blue" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(sr.blue) + '</span>蓝球 ' + blueReason + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="disclaimer"><strong>声明：</strong>自动复盘与优化基于历史数据统计分析，权重调整仅供参考。彩票开奖为随机事件，优化后的推荐不构成投注建议。</div>';

  container.innerHTML = html;
}

// ==================== 快乐8自动复盘 ====================

function autoReviewKL8() {
  if (typeof kl8SampleHistory === 'undefined' || kl8SampleHistory.length < 10) return;

  var actualDraw = kl8SampleHistory[0];
  var actualNums = actualDraw.split(',').map(Number).sort(function(a, b) { return a - b; });

  var simHistory = kl8SampleHistory.slice(1);
  var simAllNums = [];
  for (var i = 0; i < simHistory.length; i++) {
    simAllNums.push(simHistory[i].split(',').map(Number).sort(function(a, b) { return a - b; }));
  }

  var simLast = simAllNums[0];

  var simScores = scoreKL8Numbers(simLast, simAllNums);

  var playType = 10;

  var simRecommendations = generateKL8SimPicks(simScores, playType);

  var reviewResults = [];
  for (var set = 0; set < 3; set++) {
    var hits = simRecommendations[set].filter(function(n) { return actualNums.indexOf(n) >= 0; });
    var hitRate = hits.length * 10;
    reviewResults.push({
      set: set + 1,
      picks: simRecommendations[set],
      hits: hits,
      hitRate: hitRate
    });
  }

  var optimizedWeights = optimizeKL8Weights(reviewResults, simScores);

  var fullNums = [actualNums].concat(simAllNums);
  var optScores = scoreKL8NumbersOptimized(actualNums, fullNums, optimizedWeights);

  renderAutoReviewKL8(reviewResults, optimizedWeights, optScores, actualNums, playType);
}

function generateKL8SimPicks(scores, playType) {
  var sorted = scores.slice().sort(function(a, b) { return b.total - a.total; });
  var recommendations = [];

  for (var set = 0; set < 3; set++) {
    var picks = [];
    var usedNums = {};
    var zoneCounts = [0, 0, 0, 0];
    var startIdx = set;

    for (var pass = 0; pass < 2 && picks.length < playType; pass++) {
      for (var i = startIdx; i < sorted.length && picks.length < playType; i++) {
        var n = sorted[i].num;
        if (usedNums[n]) continue;
        var z = n <= 20 ? 0 : n <= 40 ? 1 : n <= 60 ? 2 : 3;
        if (pass === 0 && zoneCounts[z] >= Math.ceil(playType / 3)) continue;
        picks.push(n);
        usedNums[n] = true;
        zoneCounts[z]++;
      }
    }
    picks.sort(function(a, b) { return a - b; });
    recommendations.push(picks);
  }
  return recommendations;
}

function optimizeKL8Weights(reviewResults, simScores) {
  var weights = { freq: 25, miss: 20, repeat: 15, zone: 15, adj: 5, tail: 3, oddEven: 2 };

  var hitNums = [];
  for (var set = 0; set < reviewResults.length; set++) {
    hitNums = hitNums.concat(reviewResults[set].hits);
  }
  hitNums = unique(hitNums);

  var highScoreHitCount = 0;
  for (var i = 0; i < hitNums.length; i++) {
    var n = hitNums[i];
    for (var j = 0; j < simScores.length; j++) {
      if (simScores[j].num === n && simScores[j].total >= 60) {
        highScoreHitCount++;
        break;
      }
    }
  }

  var totalHits = Math.max(1, hitNums.length);

  if (highScoreHitCount / totalHits > 0.5) {
    weights.freq = Math.min(35, weights.freq + 5);
    weights.miss = Math.min(30, weights.miss + 3);
  } else {
    weights.freq = Math.max(15, weights.freq - 3);
    weights.miss = Math.max(10, weights.miss - 3);
  }

  return weights;
}

function scoreKL8NumbersOptimized(last, history, w) {
  var totalPeriods = history.length;
  var expected = (20 / 80) * totalPeriods;
  var scores = [];

  for (var n = 1; n <= 80; n++) {
    var score = { num: n, total: 0, reasons: [] };

    var freq = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) freq++;
    }
    var freqScore = Math.min(w.freq, (freq / expected) * w.freq);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');
    else if (freq >= expected) score.reasons.push('温号稳定');

    var miss = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === history.length) miss = history.length;
    var avgMiss = Math.round(80 / 20);
    var missScore = miss >= avgMiss * 0.5 && miss <= avgMiss * 2 ? Math.min(w.miss, (miss / avgMiss) * w.miss) : w.miss * 0.4;
    if (miss >= avgMiss) score.reasons.push('遗漏回补号');

    var repeatScore = 0;
    if (last.indexOf(n) >= 0) {
      repeatScore = w.repeat;
      score.reasons.push('上期重号候选');
    } else {
      for (var i = 0; i < last.length; i++) {
        if (Math.abs(n - last[i]) === 1) {
          repeatScore = w.repeat * 0.5;
          score.reasons.push('连号关联');
          break;
        }
      }
    }

    var zoneIdx = n <= 20 ? 0 : n <= 40 ? 1 : n <= 60 ? 2 : 3;
    var recentZoneCounts = [0, 0, 0, 0];
    var recentN = Math.min(5, history.length);
    for (var i = 0; i < recentN; i++) {
      for (var j = 0; j < history[i].length; j++) {
        var zn = history[i][j] <= 20 ? 0 : history[i][j] <= 40 ? 1 : history[i][j] <= 60 ? 2 : 3;
        recentZoneCounts[zn]++;
      }
    }
    var zoneAvg = recentZoneCounts[zoneIdx] / recentN;
    var zoneScore = zoneAvg < 4 ? w.zone : zoneAvg < 5 ? w.zone * 0.67 : w.zone * 0.33;
    if (zoneAvg < 4) score.reasons.push('区间回补');

    score.total = freqScore + missScore + repeatScore + zoneScore + w.adj + w.tail + w.oddEven;
    scores.push(score);
  }
  return scores;
}

function renderAutoReviewKL8(reviewResults, weights, optScores, actualNums, playType) {
  var card = document.getElementById('kl8-auto-review-card');
  var container = document.getElementById('kl8-auto-review');
  if (!card || !container) return;

  card.style.display = 'block';

  var html = '';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">实际开奖号码（最新一期）</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < actualNums.length; i++) {
    html += '<div class="ball gold" style="width:36px;height:36px;font-size:0.75rem">' + pad(actualNums[i]) + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem">模拟推荐 vs 实际开奖对比</div>';

  for (var set = 0; set < reviewResults.length; set++) {
    var r = reviewResults[set];
    var hitColor = r.hitRate >= 50 ? 'var(--accent3)' : r.hitRate >= 20 ? 'var(--accent)' : 'var(--muted)';
    html += '<div style="background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem;margin-bottom:0.5rem">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem">';
    html += '<span style="color:var(--muted);font-size:0.82rem">模拟方案 ' + r.set + '（选' + playType + '）</span>';
    html += '<span style="color:' + hitColor + ';font-weight:700;font-size:0.85rem">得分 ' + r.hitRate + '</span>';
    html += '</div>';
    html += '<div class="ball-row" style="margin-bottom:0.25rem">';
    for (var i = 0; i < r.picks.length; i++) {
      var isHit = r.hits.indexOf(r.picks[i]) >= 0;
      html += '<div class="ball ' + (isHit ? 'gold' : 'gray') + '" style="width:36px;height:36px;font-size:0.75rem">' + pad(r.picks[i]) + '</div>';
    }
    html += '</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted)">命中 ' + r.hits.length + '/' + playType + ' 个</div>';
    html += '</div>';
  }
  html += '</div>';

  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem">权重优化详情</div>';
  var baseWeights = { freq: 25, miss: 20, repeat: 15, zone: 15, adj: 5, tail: 3, oddEven: 2 };
  var weightLabels = { freq: '频率', miss: '遗漏', repeat: '重号', zone: '区间', adj: '连号', tail: '尾数', oddEven: '奇偶' };
  html += '<div class="stat-grid">';
  for (var key in weights) {
    var diff = weights[key] - baseWeights[key];
    var diffStr = diff > 0 ? '<span style="color:var(--accent3)">+' + diff + '</span>' : diff < 0 ? '<span style="color:var(--accent4)">' + diff + '</span>' : '<span style="color:var(--muted)">0</span>';
    html += '<div class="stat-item">';
    html += '<div class="stat-value" style="font-size:1.1rem">' + weights[key] + ' ' + diffStr + '</div>';
    html += '<div class="stat-label">' + weightLabels[key] + '权重</div>';
    html += '</div>';
  }
  html += '</div></div>';

  // 优化后精准推荐：使用5层AI引擎（与综合推荐算法完全不同）
  var lastDraw2 = kl8SampleHistory[0].split(',').map(Number).sort(function(a, b) { return a - b; });
  var smartRecs = smartRecommendKL8(kl8SampleHistory, lastDraw2);

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:0.5rem">优化后精准推荐（AI五层融合引擎）</div>';
  html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.75rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合，与综合推荐采用不同算法</div>';

  for (var si = 0; si < smartRecs.length; si++) {
    var sr = smartRecs[si];
    html += '<div style="margin-bottom:1rem;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">优化方案 ' + (si + 1) + '（选' + playType + '）</div>';
    html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">胆码: ';
    for (var j = 0; j < sr.danma.length; j++) {
      html += '<span style="font-weight:700">' + pad(sr.danma[j]) + '</span>';
      if (j < sr.danma.length - 1) html += ', ';
    }
    html += ' | 拖码: ';
    for (var j = 0; j < sr.tuoma.length; j++) {
      html += pad(sr.tuoma[j]);
      if (j < sr.tuoma.length - 1) html += ', ';
    }
    html += '</div>';
    html += '<div class="ball-row">';
    for (var j = 0; j < sr.picks.length; j++) {
      var isDan = sr.danma.indexOf(sr.picks[j]) >= 0;
      html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '" style="width:36px;height:36px;font-size:0.75rem">' + pad(sr.picks[j]) + '</div>';
    }
    html += '</div>';

    // 选号理由（仅第一组显示）
    if (si === 0) {
      html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
      html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
      for (var j = 0; j < sr.picks.length; j++) {
        var n = sr.picks[j];
        var isDanR = sr.danma.indexOf(n) >= 0;
        var reason = sr.reasons[n] || '综合评分较高';
        html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDanR ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + pad(n) + '</span>' + reason + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="disclaimer"><strong>声明：</strong>自动复盘与优化基于历史数据统计分析，权重调整仅供参考。彩票开奖为随机事件，优化后的推荐不构成投注建议。</div>';

  container.innerHTML = html;
}

// ==================== 排列三自动复盘 ====================

function autoReviewPL3() {
  if (typeof PL3_HISTORY === 'undefined' || PL3_HISTORY.length < 10) return;

  var actualNums = PL3_HISTORY[0].numbers;

  var simHistory = [];
  for (var i = 1; i < PL3_HISTORY.length; i++) {
    simHistory.push(PL3_HISTORY[i].numbers);
  }

  var simLast = simHistory[0];

  var simScores = scorePL3Numbers(simLast, simHistory);

  var simRecommendations = generatePLSimPicks(simScores, 3);

  var reviewResults = [];
  for (var set = 0; set < 3; set++) {
    var hits = 0;
    var posHits = 0;
    for (var i = 0; i < 3; i++) {
      if (simRecommendations[set][i] === actualNums[i]) posHits++;
      if (actualNums.indexOf(simRecommendations[set][i]) >= 0) hits++;
    }
    var hitRate = posHits * 30 + (hits - posHits) * 10;
    reviewResults.push({
      set: set + 1,
      picks: simRecommendations[set],
      posHits: posHits,
      numHits: hits,
      hitRate: hitRate
    });
  }

  var optimizedWeights = optimizePLWeights(reviewResults, simScores, 'PL3');

  var fullHistory = [actualNums].concat(simHistory);
  var optScores = scorePL3NumbersOptimized(actualNums, fullHistory, optimizedWeights);

  renderAutoReviewPL(reviewResults, optimizedWeights, optScores, actualNums, 'PL3', 3);
}

// ==================== 排列五自动复盘 ====================

function autoReviewPL5() {
  if (typeof PL5_HISTORY === 'undefined' || PL5_HISTORY.length < 10) return;

  var actualNums = PL5_HISTORY[0].numbers;

  var simHistory = [];
  for (var i = 1; i < PL5_HISTORY.length; i++) {
    simHistory.push(PL5_HISTORY[i].numbers);
  }

  var simLast = simHistory[0];

  var simScores = scorePL5Numbers(simLast, simHistory);

  var simRecommendations = generatePLSimPicks(simScores, 5);

  var reviewResults = [];
  for (var set = 0; set < 3; set++) {
    var hits = 0;
    var posHits = 0;
    for (var i = 0; i < 5; i++) {
      if (simRecommendations[set][i] === actualNums[i]) posHits++;
      if (actualNums.indexOf(simRecommendations[set][i]) >= 0) hits++;
    }
    var hitRate = posHits * 20 + (hits - posHits) * 5;
    reviewResults.push({
      set: set + 1,
      picks: simRecommendations[set],
      posHits: posHits,
      numHits: hits,
      hitRate: hitRate
    });
  }

  var optimizedWeights = optimizePLWeights(reviewResults, simScores, 'PL5');

  var fullHistory = [actualNums].concat(simHistory);
  var optScores = scorePL5NumbersOptimized(actualNums, fullHistory, optimizedWeights);

  renderAutoReviewPL(reviewResults, optimizedWeights, optScores, actualNums, 'PL5', 5);
}

function generatePLSimPicks(scores, pickCount) {
  var sorted = scores.slice().sort(function(a, b) { return b.total - a.total; });
  var recommendations = [];

  for (var set = 0; set < 3; set++) {
    var picks = [];
    var usedNums = {};
    picks.push(sorted[set].num);
    usedNums[sorted[set].num] = true;
    for (var i = 0; i < sorted.length && picks.length < pickCount; i++) {
      var n = sorted[i].num;
      if (!usedNums[n]) {
        picks.push(n);
        usedNums[n] = true;
      }
    }
    recommendations.push(picks);
  }
  return recommendations;
}

function optimizePLWeights(reviewResults, simScores, type) {
  var weights = { freq: 30, miss: 25, repeat: 25, oddEven: 10, bigSmall: 10 };

  var hitNums = [];
  for (var set = 0; set < reviewResults.length; set++) {
    hitNums = hitNums.concat(reviewResults[set].picks);
  }
  hitNums = unique(hitNums);

  var freqHitCount = 0, missHitCount = 0, repeatHitCount = 0;
  for (var i = 0; i < hitNums.length; i++) {
    var n = hitNums[i];
    for (var j = 0; j < simScores.length; j++) {
      if (simScores[j].num === n) {
        if (simScores[j].freqScore >= 20) freqHitCount++;
        if (simScores[j].missScore >= 15) missHitCount++;
        if (simScores[j].repeatScore >= 15) repeatHitCount++;
        break;
      }
    }
  }

  var totalHits = Math.max(1, hitNums.length);

  if (freqHitCount / totalHits > 0.5) weights.freq = Math.min(40, weights.freq + 5);
  else weights.freq = Math.max(20, weights.freq - 3);

  if (missHitCount / totalHits > 0.4) weights.miss = Math.min(35, weights.miss + 5);
  else weights.miss = Math.max(15, weights.miss - 3);

  if (repeatHitCount / totalHits > 0.3) weights.repeat = Math.min(35, weights.repeat + 5);
  else weights.repeat = Math.max(15, weights.repeat - 3);

  return weights;
}

function scorePL3NumbersOptimized(last, history, w) {
  var totalPeriods = history.length;
  var expected = (3 / 10) * totalPeriods;
  var scores = [];

  for (var n = 0; n <= 9; n++) {
    var score = { num: n, freqScore: 0, missScore: 0, repeatScore: 0, total: 0, reasons: [] };

    var freq = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) freq++;
    }
    score.freqScore = Math.min(w.freq, (freq / Math.max(1, expected)) * w.freq);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');
    else if (freq >= expected) score.reasons.push('温号稳定');

    var miss = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === history.length) miss = history.length;
    var avgMiss = Math.round(10 / 3);
    if (miss >= avgMiss * 0.8 && miss <= avgMiss * 2) {
      score.missScore = Math.min(w.miss, (miss / avgMiss) * w.miss);
      if (miss >= avgMiss) score.reasons.push('遗漏回补号');
    } else if (miss > avgMiss * 2) {
      score.missScore = w.miss * 0.4;
      score.reasons.push('超长遗漏');
    } else {
      score.missScore = w.miss * 0.48;
    }

    if (last.indexOf(n) >= 0) {
      score.repeatScore = w.repeat;
      score.reasons.push('上期重号候选');
    } else {
      for (var i = 0; i < last.length; i++) {
        if (Math.abs(n - last[i]) === 1) {
          score.repeatScore = w.repeat * 0.48;
          score.reasons.push('邻号关联');
          break;
        }
      }
    }

    var oddEvenBonus = 0;
    var lastOdd = last.filter(function(x) { return x % 2 === 1; }).length;
    var isOdd = n % 2 === 1;
    if (lastOdd >= 2 && !isOdd) { oddEvenBonus = w.oddEven; score.reasons.push('偶数回补'); }
    else if (lastOdd <= 1 && isOdd) { oddEvenBonus = w.oddEven; score.reasons.push('奇数回补'); }
    else { oddEvenBonus = w.oddEven * 0.5; }

    var bigSmallBonus = 0;
    var lastBig = last.filter(function(x) { return x >= 5; }).length;
    var isBig = n >= 5;
    if (lastBig >= 2 && !isBig) { bigSmallBonus = w.bigSmall; score.reasons.push('小数回补'); }
    else if (lastBig <= 1 && isBig) { bigSmallBonus = w.bigSmall; score.reasons.push('大数回补'); }
    else { bigSmallBonus = w.bigSmall * 0.5; }

    score.total = score.freqScore + score.missScore + score.repeatScore + oddEvenBonus + bigSmallBonus;
    scores.push(score);
  }

  return scores;
}

function scorePL5NumbersOptimized(last, history, w) {
  var totalPeriods = history.length;
  var expected = (5 / 10) * totalPeriods;
  var scores = [];

  for (var n = 0; n <= 9; n++) {
    var score = { num: n, freqScore: 0, missScore: 0, repeatScore: 0, total: 0, reasons: [] };

    var freq = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) freq++;
    }
    score.freqScore = Math.min(w.freq, (freq / Math.max(1, expected)) * w.freq);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');
    else if (freq >= expected) score.reasons.push('温号稳定');

    var miss = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === history.length) miss = history.length;
    var avgMiss = Math.round(10 / 5);
    if (miss >= avgMiss * 0.8 && miss <= avgMiss * 2) {
      score.missScore = Math.min(w.miss, (miss / avgMiss) * w.miss);
      if (miss >= avgMiss) score.reasons.push('遗漏回补号');
    } else if (miss > avgMiss * 2) {
      score.missScore = w.miss * 0.4;
      score.reasons.push('超长遗漏');
    } else {
      score.missScore = w.miss * 0.48;
    }

    if (last.indexOf(n) >= 0) {
      score.repeatScore = w.repeat;
      score.reasons.push('上期重号候选');
    } else {
      for (var i = 0; i < last.length; i++) {
        if (Math.abs(n - last[i]) === 1) {
          score.repeatScore = w.repeat * 0.48;
          score.reasons.push('邻号关联');
          break;
        }
      }
    }

    var oddEvenBonus = 0;
    var lastOdd = last.filter(function(x) { return x % 2 === 1; }).length;
    var isOdd = n % 2 === 1;
    if (lastOdd >= 3 && !isOdd) { oddEvenBonus = w.oddEven; score.reasons.push('偶数回补'); }
    else if (lastOdd <= 2 && isOdd) { oddEvenBonus = w.oddEven; score.reasons.push('奇数回补'); }
    else { oddEvenBonus = w.oddEven * 0.5; }

    var bigSmallBonus = 0;
    var lastBig = last.filter(function(x) { return x >= 5; }).length;
    var isBig = n >= 5;
    if (lastBig >= 3 && !isBig) { bigSmallBonus = w.bigSmall; score.reasons.push('小数回补'); }
    else if (lastBig <= 2 && isBig) { bigSmallBonus = w.bigSmall; score.reasons.push('大数回补'); }
    else { bigSmallBonus = w.bigSmall * 0.5; }

    score.total = score.freqScore + score.missScore + score.repeatScore + oddEvenBonus + bigSmallBonus;
    scores.push(score);
  }

  return scores;
}

function renderAutoReviewPL(reviewResults, weights, optScores, actualNums, type, pickCount) {
  var card = document.getElementById(type.toLowerCase() + '-auto-review-card');
  var container = document.getElementById(type.toLowerCase() + '-auto-review');
  if (!card || !container) return;

  card.style.display = 'block';

  var typeName = type === 'PL3' ? '排列三' : '排列五';

  var html = '';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">实际开奖号码（最新一期）</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < actualNums.length; i++) {
    html += '<div class="ball red">' + actualNums[i] + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem">模拟推荐 vs 实际开奖对比</div>';

  for (var set = 0; set < reviewResults.length; set++) {
    var r = reviewResults[set];
    var hitColor = r.hitRate >= 50 ? 'var(--accent3)' : r.hitRate >= 20 ? 'var(--accent)' : 'var(--muted)';
    html += '<div style="background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem;margin-bottom:0.5rem">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem">';
    html += '<span style="color:var(--muted);font-size:0.82rem">模拟方案 ' + r.set + '</span>';
    html += '<span style="color:' + hitColor + ';font-weight:700;font-size:0.85rem">得分 ' + r.hitRate + '</span>';
    html += '</div>';
    html += '<div class="ball-row" style="margin-bottom:0.25rem">';
    for (var i = 0; i < r.picks.length; i++) {
      var isHit = r.picks[i] === actualNums[i];
      html += '<div class="ball ' + (isHit ? 'gold' : 'gray') + '">' + r.picks[i] + '</div>';
    }
    html += '</div>';
    var hitDesc = [];
    if (r.posHits > 0) hitDesc.push('定位命中' + r.posHits + '个');
    if (r.numHits > r.posHits) hitDesc.push('号码包含' + r.numHits + '个');
    if (hitDesc.length === 0) hitDesc.push('未命中');
    html += '<div style="font-size:0.75rem;color:var(--muted)">' + hitDesc.join('，') + '</div>';
    html += '</div>';
  }
  html += '</div>';

  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem">权重优化详情</div>';
  var baseWeights = { freq: 30, miss: 25, repeat: 25, oddEven: 10, bigSmall: 10 };
  var weightLabels = { freq: '频率', miss: '遗漏', repeat: '重号', oddEven: '奇偶', bigSmall: '大小' };
  html += '<div class="stat-grid">';
  for (var key in weights) {
    var diff = weights[key] - baseWeights[key];
    var diffStr = diff > 0 ? '<span style="color:var(--accent3)">+' + diff + '</span>' : diff < 0 ? '<span style="color:var(--accent4)">' + diff + '</span>' : '<span style="color:var(--muted)">0</span>';
    html += '<div class="stat-item">';
    html += '<div class="stat-value" style="font-size:1.1rem">' + weights[key] + ' ' + diffStr + '</div>';
    html += '<div class="stat-label">' + weightLabels[key] + '权重</div>';
    html += '</div>';
  }
  html += '</div></div>';

  // 优化后精准推荐：使用5层AI引擎（与综合推荐算法完全不同）
  var plHistory = type === 'PL3' ? PL3_HISTORY : PL5_HISTORY;
  var lastDraw2 = plHistory[0].numbers;
  var smartRecs = type === 'PL3' ? smartRecommendPL3(PL3_HISTORY, lastDraw2) : smartRecommendPL5(PL5_HISTORY, lastDraw2);

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:0.5rem">优化后精准推荐（AI五层融合引擎）</div>';
  html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.75rem">基于马尔可夫转移 + 共现关联 + 位置模式 + 趋势动量 + 贝叶斯融合，与综合推荐采用不同算法</div>';

  for (var si = 0; si < smartRecs.length; si++) {
    var sr = smartRecs[si];
    html += '<div style="margin-bottom:1rem;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">优化方案 ' + (si + 1) + '</div>';
    html += '<div style="font-size:0.75rem;color:var(--accent);margin-bottom:0.3rem">胆码: ';
    for (var j = 0; j < sr.danma.length; j++) {
      html += '<span style="font-weight:700">' + sr.danma[j] + '</span>';
      if (j < sr.danma.length - 1) html += ', ';
    }
    html += ' | 拖码: ';
    for (var j = 0; j < sr.tuoma.length; j++) {
      html += sr.tuoma[j];
      if (j < sr.tuoma.length - 1) html += ', ';
    }
    html += '</div>';
    html += '<div class="ball-row">';
    for (var j = 0; j < sr.picks.length; j++) {
      var isDan = sr.danma.indexOf(sr.picks[j]) >= 0;
      html += '<div class="ball ' + (isDan ? 'gold' : 'red') + '">' + sr.picks[j] + '</div>';
    }
    html += '</div>';

    // 选号理由（仅第一组显示）
    if (si === 0) {
      html += '<div style="margin-top:0.4rem;font-size:0.75rem;line-height:1.6;color:var(--muted);background:var(--bg2);border-radius:6px;padding:0.5rem">';
      html += '<div style="font-weight:700;color:var(--accent4);margin-bottom:0.2rem">选号理由</div>';
      for (var j = 0; j < sr.picks.length; j++) {
        var n = sr.picks[j];
        var isDanR = sr.danma.indexOf(n) >= 0;
        var reason = sr.reasons[n] || '综合评分较高';
        html += '<div style="margin-bottom:0.15rem"><span class="ball ' + (isDanR ? 'gold' : 'red') + '" style="display:inline-block;width:20px;height:20px;font-size:0.65rem;line-height:20px;vertical-align:middle;margin-right:0.3rem">' + n + '</span>' + reason + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="disclaimer"><strong>声明：</strong>自动复盘与优化基于历史数据统计分析，权重调整仅供参考。彩票开奖为随机事件，优化后的推荐不构成投注建议。</div>';

  container.innerHTML = html;
}
