/**
 * 自动复盘 + 模型优化 + 精准推荐
 * 对所有彩票类型（大乐透、双色球、快乐8、排列三、排列五）进行自动复盘
 * 根据复盘结果动态调整评分因子权重，生成优化后的精准推荐
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

// ==================== 大乐透自动复盘 ====================

function autoReviewDLT() {
  if (typeof dltSampleHistory === 'undefined' || dltSampleHistory.length < 10) return;

  var actualDraw = dltSampleHistory[0];
  var actualParts = actualDraw.split('|');
  var actualFront = actualParts[0].split(',').map(Number);
  var actualBack = actualParts[1].split(',').map(Number);

  // 用排除最新一期后的数据模拟生成推荐
  var simHistory = dltSampleHistory.slice(1);
  var simAllFronts = [];
  var simAllBacks = [];
  for (var i = 0; i < simHistory.length; i++) {
    var parts = simHistory[i].split('|');
    simAllFronts.push(parts[0].split(',').map(Number));
    simAllBacks.push(parts[1].split(',').map(Number));
  }

  var simLast = { front: simAllFronts[0], back: simAllBacks[0] };

  // 用现有评分函数生成模拟推荐
  var simScores = scoreDLTNumbers(simLast, simAllFronts, simAllBacks);
  var simBackScores = scoreDLTBackNumbers(simLast, simAllBacks);

  // 生成3组模拟推荐
  var simRecommendations = generateDLTSimPicks(simScores, simBackScores);

  // 计算每组推荐的命中率
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

  // 根据复盘结果优化权重
  var optimizedWeights = optimizeDLTWeights(reviewResults, simScores);

  // 用优化后的权重重新生成推荐（包含最新一期数据）
  var fullFronts = [actualFront].concat(simAllFronts);
  var fullBacks = [actualBack].concat(simAllBacks);
  var optScores = scoreDLTNumbersOptimized({ front: actualFront, back: actualBack }, fullFronts, fullBacks, optimizedWeights);
  var optBackScores = scoreDLTBackNumbersOptimized({ front: actualFront, back: actualBack }, fullBacks, optimizedWeights);

  // 渲染复盘结果和优化推荐
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

  // 复盘对比标题
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

  // 模拟推荐 vs 实际开奖
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

  // 权重优化详情
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

  // 精准推荐
  var optSorted = optScores.slice().sort(function(a, b) { return b.total - a.total; });
  var optBackSorted = optBackScores.slice().sort(function(a, b) { return b.total - a.total; });

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:0.75rem">优化后精准推荐</div>';

  for (var set = 0; set < 3; set++) {
    var frontPicks = [];
    var usedNums = {};
    frontPicks.push(optSorted[set].num);
    usedNums[optSorted[set].num] = true;
    var zoneCounts = [0, 0, 0];
    var firstZone = frontPicks[0] <= 12 ? 0 : frontPicks[0] <= 23 ? 1 : 2;
    zoneCounts[firstZone]++;
    for (var i = 0; i < optSorted.length && frontPicks.length < 5; i++) {
      var n = optSorted[i].num;
      if (usedNums[n]) continue;
      var z = n <= 12 ? 0 : n <= 23 ? 1 : 2;
      if (zoneCounts[z] < 3) {
        frontPicks.push(n);
        usedNums[n] = true;
        zoneCounts[z]++;
      }
    }
    for (var i = 0; i < optSorted.length && frontPicks.length < 5; i++) {
      if (!usedNums[optSorted[i].num]) {
        frontPicks.push(optSorted[i].num);
        usedNums[optSorted[i].num] = true;
      }
    }
    frontPicks.sort(function(a, b) { return a - b; });
    var backPicks = [optBackSorted[set].num, optBackSorted[(set + 1) % optBackSorted.length].num].sort(function(a, b) { return a - b; });

    html += '<div style="margin-bottom:1rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">优化方案 ' + (set + 1) + '</div>';
    html += '<div class="ball-row">';
    for (var i = 0; i < frontPicks.length; i++) {
      html += '<div class="ball red">' + pad(frontPicks[i]) + '</div>';
    }
    html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
    for (var i = 0; i < backPicks.length; i++) {
      html += '<div class="ball blue">' + pad(backPicks[i]) + '</div>';
    }
    html += '</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem">和值: ' + sum(frontPicks) + ' | 跨度: ' + span(frontPicks) + ' | 区间比: ' + zoneCounts.join(':') + '</div>';
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
    // SSQ scores don't have individual score fields, estimate from total
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

  // 权重优化详情
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

  // 精准推荐
  var optSorted = optScores.slice().sort(function(a, b) { return b.total - a.total; });
  var optBackSorted = optBackScores.slice().sort(function(a, b) { return b.total - a.total; });

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:0.75rem">优化后精准推荐</div>';

  for (var set = 0; set < 3; set++) {
    var redPicks = [];
    var usedNums = {};
    redPicks.push(optSorted[set].num);
    usedNums[optSorted[set].num] = true;
    var zoneCounts = [0, 0, 0];
    var firstZone = redPicks[0] <= 11 ? 0 : redPicks[0] <= 22 ? 1 : 2;
    zoneCounts[firstZone]++;
    for (var i = 0; i < optSorted.length && redPicks.length < 6; i++) {
      var n = optSorted[i].num;
      if (usedNums[n]) continue;
      var z = n <= 11 ? 0 : n <= 22 ? 1 : 2;
      if (zoneCounts[z] < 3) {
        redPicks.push(n);
        usedNums[n] = true;
        zoneCounts[z]++;
      }
    }
    for (var i = 0; i < optSorted.length && redPicks.length < 6; i++) {
      if (!usedNums[optSorted[i].num]) {
        redPicks.push(optSorted[i].num);
        usedNums[optSorted[i].num] = true;
      }
    }
    redPicks.sort(function(a, b) { return a - b; });
    var bluePick = optBackSorted[set].num;

    html += '<div style="margin-bottom:1rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">优化方案 ' + (set + 1) + '</div>';
    html += '<div class="ball-row">';
    for (var i = 0; i < redPicks.length; i++) {
      html += '<div class="ball red">' + pad(redPicks[i]) + '</div>';
    }
    html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
    html += '<div class="ball blue">' + pad(bluePick) + '</div>';
    html += '</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem">和值: ' + sum(redPicks) + ' | 跨度: ' + span(redPicks) + ' | 区间比: ' + zoneCounts.join(':') + '</div>';
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

  var playType = 10; // default

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

  // 权重优化详情
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

  // 精准推荐
  var optSorted = optScores.slice().sort(function(a, b) { return b.total - a.total; });

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:0.75rem">优化后精准推荐</div>';

  for (var set = 0; set < 3; set++) {
    var picks = [];
    var usedNums = {};
    var zoneCounts = [0, 0, 0, 0];
    var startIdx = set;

    for (var pass = 0; pass < 2 && picks.length < playType; pass++) {
      for (var i = startIdx; i < optSorted.length && picks.length < playType; i++) {
        var n = optSorted[i].num;
        if (usedNums[n]) continue;
        var z = n <= 20 ? 0 : n <= 40 ? 1 : n <= 60 ? 2 : 3;
        if (pass === 0 && zoneCounts[z] >= Math.ceil(playType / 3)) continue;
        picks.push(n);
        usedNums[n] = true;
        zoneCounts[z]++;
      }
    }
    picks.sort(function(a, b) { return a - b; });

    html += '<div style="margin-bottom:1rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">优化方案 ' + (set + 1) + '（选' + playType + '）</div>';
    html += '<div class="ball-row">';
    for (var i = 0; i < picks.length; i++) {
      html += '<div class="ball gold" style="width:36px;height:36px;font-size:0.75rem">' + pad(picks[i]) + '</div>';
    }
    html += '</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem">和值: ' + sum(picks) + ' | 跨度: ' + span(picks) + ' | 区间分布: ' + zoneCounts.join(':') + '</div>';
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

  // 权重优化详情
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

  // 精准推荐
  var optSorted = optScores.slice().sort(function(a, b) { return b.total - a.total; });

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:0.75rem">优化后精准推荐</div>';

  for (var set = 0; set < 3; set++) {
    var picks = [];
    var usedNums = {};
    picks.push(optSorted[set].num);
    usedNums[optSorted[set].num] = true;
    for (var i = 0; i < optSorted.length && picks.length < pickCount; i++) {
      var n = optSorted[i].num;
      if (!usedNums[n]) {
        picks.push(n);
        usedNums[n] = true;
      }
    }

    html += '<div style="margin-bottom:1rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">优化方案 ' + (set + 1) + '</div>';
    html += '<div class="ball-row">';
    for (var i = 0; i < picks.length; i++) {
      html += '<div class="ball red">' + picks[i] + '</div>';
    }
    html += '</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem">和值: ' + sum(picks) + ' | 跨度: ' + span(picks) + ' | 奇偶: ' + picks.filter(function(x){return x%2===1}).length + ':' + picks.filter(function(x){return x%2===0}).length + ' | 大小: ' + picks.filter(function(x){return x>=5}).length + ':' + picks.filter(function(x){return x<5}).length + '</div>';
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="disclaimer"><strong>声明：</strong>自动复盘与优化基于历史数据统计分析，权重调整仅供参考。彩票开奖为随机事件，优化后的推荐不构成投注建议。</div>';

  container.innerHTML = html;
}
