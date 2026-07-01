/**
 * 票花自主分析引擎
 * 支持大乐透(DLT)、排列三(PL3)、排列五(PL5)
 * 支持多组票花+号码综合分析
 */

// ==================== 票花字母含义映射表 ====================
var FLOWER_MAP = {
  'A': { name: 'A/a', meaning: '1位/百位、低位正确、有胆', type: 'positive', score: 8 },
  'a': { name: 'A/a', meaning: '1位/百位、低位正确、有胆', type: 'positive', score: 8 },
  'B': { name: 'B/b', meaning: '前后位置、前/后区、区间', type: 'neutral', score: 5 },
  'b': { name: 'B/b', meaning: '前后位置、前/后区、区间', type: 'neutral', score: 5 },
  'C': { name: 'C/c', meaning: '肯定出号、必出、稳胆', type: 'strong_positive', score: 10 },
  'c': { name: 'C/c', meaning: '肯定出号、必出、稳胆', type: 'strong_positive', score: 10 },
  'D': { name: 'D/d', meaning: '尾数、最后一位、个位', type: 'neutral', score: 5 },
  'd': { name: 'D/d', meaning: '尾数、最后一位、个位', type: 'neutral', score: 5 },
  'E': { name: 'E/e', meaning: '左右±1、邻号、相邻数', type: 'positive', score: 7 },
  'e': { name: 'E/e', meaning: '左右±1、邻号、相邻数', type: 'positive', score: 7 },
  'F': { name: 'F/f', meaning: '首选、第一胆、重点', type: 'strong_positive', score: 10 },
  'f': { name: 'F/f', meaning: '首选、第一胆、重点', type: 'strong_positive', score: 10 },
  'G': { name: 'G/g', meaning: '和值、总和、数字7', type: 'neutral', score: 4 },
  'g': { name: 'G/g', meaning: '和值、总和、数字7', type: 'neutral', score: 4 },
  'H': { name: 'H/h', meaning: '一半、中间数、中号', type: 'neutral', score: 5 },
  'h': { name: 'H/h', meaning: '一半、中间数、中号', type: 'neutral', score: 5 },
  'I': { name: 'I/i', meaning: '在区间内、范围号', type: 'neutral', score: 5 },
  'i': { name: 'I/i', meaning: '在区间内、范围号', type: 'neutral', score: 5 },
  'J': { name: 'J/j', meaning: '正确、数字4', type: 'positive', score: 6 },
  'j': { name: 'J/j', meaning: '正确、数字4', type: 'positive', score: 6 },
  'K': { name: 'K/k', meaning: '小号、和值、偏小', type: 'neutral', score: 4 },
  'k': { name: 'K/k', meaning: '小号、和值、偏小', type: 'neutral', score: 4 },
  'L': { name: 'L/l', meaning: '正确、稳号、必出', type: 'strong_positive', score: 9 },
  'l': { name: 'L/l', meaning: '正确、稳号、必出', type: 'strong_positive', score: 9 },
  'M': { name: 'M/m', meaning: '大号、最大数、偏大', type: 'neutral', score: 4 },
  'm': { name: 'M/m', meaning: '大号、最大数、偏大', type: 'neutral', score: 4 },
  'N': { name: 'N/n', meaning: '接近、邻号、差1', type: 'positive', score: 7 },
  'n': { name: 'N/n', meaning: '接近、邻号、差1', type: 'positive', score: 7 },
  'O': { name: 'O/o', meaning: '0号、适当、适中', type: 'neutral', score: 3 },
  'o': { name: 'O/o', meaning: '0号、适当、适中', type: 'neutral', score: 3 },
  'P': { name: 'P/p', meaning: '后面、十位/个位、后位', type: 'neutral', score: 4 },
  'p': { name: 'P/p', meaning: '后面、十位/个位、后位', type: 'neutral', score: 4 },
  'Q': { name: 'Q/q', meaning: '胆码、和值尾、关键号', type: 'strong_positive', score: 9 },
  'q': { name: 'Q/q', meaning: '胆码、和值尾、关键号', type: 'strong_positive', score: 9 },
  'R': { name: 'R/r', meaning: '大号、偏大、跨度', type: 'neutral', score: 4 },
  'r': { name: 'R/r', meaning: '大号、偏大、跨度', type: 'neutral', score: 4 },
  'S': { name: 'S/s', meaning: '一侧、数字7、偏态', type: 'neutral', score: 3 },
  's': { name: 'S/s', meaning: '一侧、数字7、偏态', type: 'neutral', score: 3 },
  'T': { name: 'T/t', meaning: '错误、放弃、不选', type: 'negative', score: -5 },
  't': { name: 'T/t', meaning: '错误、放弃、不选', type: 'negative', score: -5 },
  'U': { name: 'U/u', meaning: '最后、末尾、个位', type: 'neutral', score: 4 },
  'u': { name: 'U/u', meaning: '最后、末尾、个位', type: 'neutral', score: 4 },
  'V': { name: 'V/v', meaning: '重要号、核心胆', type: 'strong_positive', score: 9 },
  'v': { name: 'V/v', meaning: '重要号、核心胆', type: 'strong_positive', score: 9 },
  'W': { name: 'W/w', meaning: '重要、重点号', type: 'strong_positive', score: 8 },
  'w': { name: 'W/w', meaning: '重要、重点号', type: 'strong_positive', score: 8 },
  'X': { name: 'X/x', meaning: '放弃、排除、不打', type: 'negative', score: -5 },
  'x': { name: 'X/x', meaning: '放弃、排除、不打', type: 'negative', score: -5 },
  'Y': { name: 'Y/y', meaning: '重号、上期号、落号', type: 'positive', score: 7 },
  'y': { name: 'Y/y', meaning: '重号、上期号、落号', type: 'positive', score: 7 },
  'Z': { name: 'Z/z', meaning: '重点、核心、必防', type: 'strong_positive', score: 9 },
  'z': { name: 'Z/z', meaning: '重点、核心、必防', type: 'strong_positive', score: 9 },
  '*': { name: '*', meaning: '有号、出号', type: 'positive', score: 6 }
};

// ==================== 票花解析 ====================
function parseFlowerString(str) {
  if (!str || !str.trim()) return [];
  var chars = str.trim().split('');
  var result = [];
  for (var i = 0; i < chars.length; i++) {
    var info = FLOWER_MAP[chars[i]];
    if (info) {
      result.push({
        char: chars[i],
        index: i,
        name: info.name,
        meaning: info.meaning,
        type: info.type,
        score: info.score
      });
    }
  }
  return result;
}

// ==================== 解析多组输入 ====================
function parseGroups(flowerStr, numStr) {
  var flowers = flowerStr.split('\n').map(function(s){return s.trim();}).filter(function(s){return s;});
  var numLines = numStr.split('\n').map(function(s){return s.trim();}).filter(function(s){return s;});

  var groups = [];

  // 检查号码行是否为 "票花|号码" 格式
  var pipeFormat = false;
  for (var i = 0; i < numLines.length; i++) {
    if (numLines[i].indexOf('|') >= 0) {
      pipeFormat = true;
      break;
    }
  }

  if (pipeFormat) {
    for (var i = 0; i < numLines.length; i++) {
      var parts = numLines[i].split('|');
      if (parts.length >= 2) {
        var f = parts[0].trim();
        var nums = parts[1].trim().split(/[,，\s]+/).map(function(s){return parseInt(s.trim(),10);}).filter(function(n){return !isNaN(n) && n >= 0;});
        if (f && nums.length > 0) groups.push({flower: f, numbers: nums});
      }
    }
    return groups;
  }

  if (flowers.length === 1 && numLines.length >= 1) {
    for (var i = 0; i < numLines.length; i++) {
      var nums = numLines[i].split(/[,，\s]+/).map(function(s){return parseInt(s.trim(),10);}).filter(function(n){return !isNaN(n) && n >= 0;});
      if (nums.length > 0) groups.push({flower: flowers[0], numbers: nums});
    }
    return groups;
  }

  if (flowers.length === numLines.length) {
    for (var i = 0; i < flowers.length; i++) {
      var nums = numLines[i].split(/[,，\s]+/).map(function(s){return parseInt(s.trim(),10);}).filter(function(n){return !isNaN(n) && n >= 0;});
      if (flowers[i] && nums.length > 0) groups.push({flower: flowers[i], numbers: nums});
    }
    return groups;
  }

  // 默认：用第一个票花对应所有号码行
  for (var i = 0; i < numLines.length; i++) {
    var nums = numLines[i].split(/[,，\s]+/).map(function(s){return parseInt(s.trim(),10);}).filter(function(n){return !isNaN(n) && n >= 0;});
    if (nums.length > 0) groups.push({flower: flowers[0] || '', numbers: nums});
  }
  return groups;
}

// ==================== 号码评分 ====================
// 核心原则：按位置一对一匹配。票花第i个字符只评价号码第i个号码。
// 大乐透：票花1-4位对应前区号码位置关系，5-6位对应后区。
// 排列三/五：票花按位对应各位数字。
function scoreNumbersByFlower(numbers, flowerInfo, lotteryType) {
  var scores = [];

  for (var i = 0; i < numbers.length; i++) {
    var num = numbers[i];
    var numScore = 0;
    var reasons = [];
    var isDan = false;
    var isExclude = false;

    // 按位置获取对应的票花字符（一对一匹配）
    var f = flowerInfo[i];
    var match = false;

    if (f) {
      switch (f.char) {
        case 'A': case 'a':
          if (lotteryType === 'dlt' && num <= 12) match = true;
          else if (lotteryType === 'pl3' && num <= 3) match = true;
          else if (lotteryType === 'pl5' && num <= 2) match = true;
          break;
        case 'C': case 'c':
          match = true; isDan = true;
          break;
        case 'E': case 'e':
          match = true;
          reasons.push('邻号潜力（±1范围）');
          break;
        case 'F': case 'f':
          match = true; isDan = true;
          break;
        case 'J': case 'j':
          if (num === 4 || num % 10 === 4) match = true;
          break;
        case 'L': case 'l':
          match = true; isDan = true;
          break;
        case 'N': case 'n':
          match = true;
          reasons.push('邻号潜力（差1）');
          break;
        case 'Q': case 'q':
          match = true; isDan = true;
          break;
        case 'T': case 't':
          isExclude = true;
          break;
        case 'V': case 'v':
          match = true; isDan = true;
          break;
        case 'W': case 'w':
          match = true;
          break;
        case 'X': case 'x':
          isExclude = true;
          break;
        case 'Y': case 'y':
          match = true;
          reasons.push('重号潜力');
          break;
        case 'Z': case 'z':
          match = true; isDan = true;
          break;
        case '*':
          match = true;
          break;
        case 'D': case 'd':
          match = true;
          reasons.push('尾数关注');
          break;
        case 'H': case 'h':
          if (lotteryType === 'dlt' && num >= 13 && num <= 23) match = true;
          else if ((lotteryType === 'pl3' || lotteryType === 'pl5') && num >= 4 && num <= 6) match = true;
          break;
        case 'M': case 'm':
          if (lotteryType === 'dlt' && num >= 24) match = true;
          else if (lotteryType === 'pl3' && num >= 7) match = true;
          else if (lotteryType === 'pl5' && num >= 7) match = true;
          break;
        case 'K': case 'k':
          if (lotteryType === 'dlt' && num <= 12) match = true;
          else if ((lotteryType === 'pl3' || lotteryType === 'pl5') && num <= 3) match = true;
          break;
        case 'O': case 'o':
          if (num === 0 || num === 10 || num === 20 || num === 30) match = true;
          break;
        case 'G': case 'g':
          if (num === 7 || num === 17 || num === 27) match = true;
          break;
        case 'S': case 's':
          if (num === 7 || num === 17 || num === 27) match = true;
          break;
        case 'R': case 'r':
          if (lotteryType === 'dlt' && num >= 25) match = true;
          break;
        case 'B': case 'b':
          match = true;
          reasons.push('位置关注');
          break;
        case 'I': case 'i':
          match = true;
          reasons.push('区间范围内');
          break;
        case 'P': case 'p':
          if (lotteryType === 'pl3' || lotteryType === 'pl5') match = true;
          break;
        case 'U': case 'u':
          match = true;
          break;
      }

      if (match) {
        numScore += f.score;
        if (reasons.indexOf(f.meaning) < 0 && reasons.length < 3) {
          reasons.push(f.meaning);
        }
      }
    }

    var finalScore = numScore;
    var level = '一般';
    var levelColor = 'var(--muted)';

    if (isExclude) {
      finalScore -= 10;
    }
    if (isDan) {
      finalScore += 5;
    }

    if (isExclude && finalScore < 0) {
      level = '建议排除';
      levelColor = 'var(--accent4)';
    } else if (isDan && finalScore > 0) {
      level = '高潜力（胆码）';
      levelColor = 'var(--gold)';
    } else if (finalScore >= 15) {
      level = '高潜力';
      levelColor = 'var(--accent3)';
    } else if (finalScore >= 8) {
      level = '较有潜力';
      levelColor = 'var(--accent)';
    } else if (finalScore > 0) {
      level = '略有潜力';
      levelColor = 'var(--accent2)';
    } else {
      level = '潜力较低';
      levelColor = 'var(--muted)';
    }

    scores.push({
      num: num,
      score: finalScore,
      level: level,
      levelColor: levelColor,
      isDan: isDan,
      isExclude: isExclude,
      reasons: reasons.length > 0 ? reasons : ['票花未明确指向'],
      position: i
    });
  }

  scores.sort(function(a, b) { return b.score - a.score; });
  return scores;
}

// ==================== 多组综合分析 ====================
function analyzeMultiGroups(groups, lotteryType) {
  var numStats = {};
  var posStats = {}; // 仅用于排列三/五的位置统计

  groups.forEach(function(group, groupIdx) {
    var flowerInfo = parseFlowerString(group.flower);
    var scores = scoreNumbersByFlower(group.numbers, flowerInfo, lotteryType);

    scores.forEach(function(s) {
      var key = String(s.num);
      if (!numStats[key]) {
        numStats[key] = {
          num: s.num,
          totalScore: 0,
          count: 0,
          danCount: 0,
          excludeCount: 0,
          groupDetails: [],
          reasons: []
        };
      }
      var stat = numStats[key];
      stat.totalScore += s.score;
      stat.count++;
      if (s.isDan) stat.danCount++;
      if (s.isExclude) stat.excludeCount++;
      stat.groupDetails.push({
        groupIndex: groupIdx + 1,
        flower: group.flower,
        score: s.score,
        isDan: s.isDan,
        isExclude: s.isExclude,
        level: s.level,
        reasons: s.reasons,
        position: s.position
      });
      s.reasons.forEach(function(r) {
        if (stat.reasons.indexOf(r) < 0) stat.reasons.push(r);
      });

      // 排列三/五按位置统计
      if (lotteryType === 'pl3' || lotteryType === 'pl5') {
        var posKey = key + '_pos' + s.position;
        if (!posStats[posKey]) {
          posStats[posKey] = { num: s.num, position: s.position, count: 0, totalScore: 0 };
        }
        posStats[posKey].count++;
        posStats[posKey].totalScore += s.score;
      }
    });
  });

  var result = [];
  for (var key in numStats) {
    var stat = numStats[key];
    stat.avgScore = Math.round((stat.totalScore / stat.count) * 10) / 10;
    var multiplier = 1 + stat.count * 0.15;
    stat.finalScore = Math.round((stat.avgScore * multiplier + stat.danCount * 2 - stat.excludeCount * 3) * 10) / 10;

    // 排列三/五：附加最常出现的位置
    if (lotteryType === 'pl3' || lotteryType === 'pl5') {
      var bestPos = -1, bestPosScore = -Infinity;
      for (var pk in posStats) {
        if (posStats[pk].num === stat.num && posStats[pk].totalScore > bestPosScore) {
          bestPosScore = posStats[pk].totalScore;
          bestPos = posStats[pk].position;
        }
      }
      stat.bestPosition = bestPos;
      var posNames = lotteryType === 'pl3' ? ['百位','十位','个位'] : ['万位','千位','百位','十位','个位'];
      stat.bestPositionName = bestPos >= 0 ? posNames[bestPos] : '';
    }

    result.push(stat);
  }

  result.sort(function(a, b) { return b.finalScore - a.finalScore; });
  return result;
}

// ==================== 渲染单组结果 ====================
function renderSingleFlowerResult(containerId, flowerInfo, scores, lotteryType, group) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var html = '';

  // 票花解析展示
  html += '<div style="margin-bottom:1rem;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem">';
  html += '<div style="font-weight:700;color:var(--accent);margin-bottom:0.5rem">票花解析</div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem">';
  for (var i = 0; i < flowerInfo.length; i++) {
    var f = flowerInfo[i];
    var color = f.type === 'strong_positive' ? 'var(--accent3)' : f.type === 'positive' ? 'var(--accent)' : f.type === 'negative' ? 'var(--accent4)' : 'var(--muted)';
    html += '<div style="display:inline-flex;align-items:center;background:var(--bg2);border:1px solid var(--rule);border-radius:6px;padding:0.3rem 0.6rem;font-size:0.8rem">';
    html += '<span style="font-weight:700;color:' + color + ';margin-right:0.3rem">' + f.char + '</span>';
    html += '<span style="color:var(--muted)">' + f.meaning + '</span>';
    html += '</div>';
  }
  html += '</div>';
  html += '</div>';

  // 号码潜力分析
  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:700;color:var(--accent);margin-bottom:0.5rem">号码潜力分析（按潜力排序）</div>';

  for (var i = 0; i < scores.length; i++) {
    var s = scores[i];
    var ballClass = s.isDan ? 'gold' : s.isExclude ? 'gray' : 'red';
    html += '<div style="background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.6rem 0.75rem;margin-bottom:0.4rem;display:flex;align-items:center;justify-content:space-between">';
    html += '<div style="display:flex;align-items:center;gap:0.75rem">';
    html += '<div class="ball ' + ballClass + '" style="width:36px;height:36px;font-size:0.85rem">' + (s.num < 10 ? '0' + s.num : s.num) + '</div>';
    html += '<div>';
    html += '<div style="font-weight:700;color:' + s.levelColor + ';font-size:0.85rem">' + s.level + '</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted)">' + s.reasons.join('；') + '</div>';
    html += '</div>';
    html += '</div>';
    html += '<div style="text-align:right">';
    html += '<div style="font-weight:700;font-size:1.1rem;color:' + (s.score > 0 ? 'var(--accent3)' : 'var(--accent4)') + '">' + (s.score > 0 ? '+' : '') + s.score + '</div>';
    html += '<div style="font-size:0.7rem;color:var(--muted)">综合分</div>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';

  // 推荐总结
  var danNums = scores.filter(function(s) { return s.isDan && !s.isExclude; });
  var goodNums = scores.filter(function(s) { return s.score >= 8 && !s.isDan && !s.isExclude; });
  var excludeNums = scores.filter(function(s) { return s.isExclude; });

  html += '<div style="background:var(--bg2);border:1px solid var(--rule);border-radius:8px;padding:0.75rem">';
  html += '<div style="font-weight:700;color:var(--accent);margin-bottom:0.5rem">分析总结</div>';

  if (danNums.length > 0) {
    html += '<div style="margin-bottom:0.4rem"><span style="color:var(--gold);font-weight:700">高潜力胆码：</span>';
    for (var i = 0; i < danNums.length; i++) {
      html += '<span class="ball gold" style="display:inline-block;width:24px;height:24px;font-size:0.7rem;line-height:24px;margin-right:0.3rem">' + (danNums[i].num < 10 ? '0' + danNums[i].num : danNums[i].num) + '</span>';
    }
    html += '</div>';
  }

  if (goodNums.length > 0) {
    html += '<div style="margin-bottom:0.4rem"><span style="color:var(--accent3);font-weight:700">较有潜力：</span>';
    for (var i = 0; i < goodNums.length; i++) {
      html += '<span class="ball red" style="display:inline-block;width:24px;height:24px;font-size:0.7rem;line-height:24px;margin-right:0.3rem">' + (goodNums[i].num < 10 ? '0' + goodNums[i].num : goodNums[i].num) + '</span>';
    }
    html += '</div>';
  }

  if (excludeNums.length > 0) {
    html += '<div style="margin-bottom:0.4rem"><span style="color:var(--accent4);font-weight:700">建议排除：</span>';
    for (var i = 0; i < excludeNums.length; i++) {
      html += '<span class="ball gray" style="display:inline-block;width:24px;height:24px;font-size:0.7rem;line-height:24px;margin-right:0.3rem">' + (excludeNums[i].num < 10 ? '0' + excludeNums[i].num : excludeNums[i].num) + '</span>';
    }
    html += '</div>';
  }

  html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.5rem">票花分析仅供参考，结合走势数据和冷热号分析可提高准确率。</div>';
  html += '</div>';

  container.innerHTML = html;
}

// ==================== 渲染多组综合结果 ====================
function renderMultiFlowerResult(containerId, groups, multiResult, lotteryType) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var html = '';

  // 输入概览
  html += '<div style="margin-bottom:1rem;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.75rem">';
  html += '<div style="font-weight:700;color:var(--accent);margin-bottom:0.5rem">输入概览（共' + groups.length + '组）</div>';
  html += '<div style="display:flex;flex-direction:column;gap:0.4rem">';
  for (var i = 0; i < groups.length; i++) {
    html += '<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem">';
    html += '<span style="background:var(--accent);color:#000;padding:0.1rem 0.4rem;border-radius:4px;font-weight:700;font-size:0.75rem">第' + (i+1) + '组</span>';
    html += '<span style="color:var(--ink);font-weight:600">' + groups[i].flower + '</span>';
    html += '<span style="color:var(--muted)">→</span>';
    html += '<span style="color:var(--ink)">' + groups[i].numbers.map(function(n){return n<10?'0'+n:n;}).join(', ') + '</span>';
    html += '</div>';
  }
  html += '</div>';
  html += '</div>';

  // 综合排名
  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:700;color:var(--accent);margin-bottom:0.5rem">号码综合潜力排名（权重高的在上）</div>';

  for (var i = 0; i < multiResult.length; i++) {
    var s = multiResult[i];
    var isTop = i < 3;
    var isDan = s.danCount >= Math.min(2, s.count) && s.finalScore > 0;
    var isExclude = s.excludeCount > s.count / 2 || (s.excludeCount > 0 && s.finalScore < 0);
    var ballClass = isExclude ? 'gray' : isDan ? 'gold' : isTop ? 'green' : 'red';
    var badge = '';
    if (s.count >= 3) badge = '<span style="background:var(--accent);color:#000;padding:0.05rem 0.3rem;border-radius:4px;font-size:0.65rem;margin-left:0.3rem;font-weight:700">多组共识</span>';
    else if (s.count >= 2) badge = '<span style="background:var(--accent2);color:#fff;padding:0.05rem 0.3rem;border-radius:4px;font-size:0.65rem;margin-left:0.3rem;font-weight:700">重复出现</span>';

    var posLabel = '';
    if ((lotteryType === 'pl3' || lotteryType === 'pl5') && s.bestPositionName) {
      posLabel = '<span style="color:var(--accent2);font-size:0.7rem;margin-left:0.3rem">[' + s.bestPositionName + ']</span>';
    }

    html += '<div style="background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:0.6rem 0.75rem;margin-bottom:0.4rem;display:flex;align-items:center;justify-content:space-between">';
    html += '<div style="display:flex;align-items:center;gap:0.75rem">';
    html += '<div class="ball ' + ballClass + '" style="width:36px;height:36px;font-size:0.85rem">' + (s.num < 10 ? '0' + s.num : s.num) + '</div>';
    html += '<div>';
    html += '<div style="font-weight:700;color:var(--ink);font-size:0.85rem;display:flex;align-items:center">';
    html += '综合得分 ' + s.finalScore + badge + posLabel;
    html += '</div>';
    html += '<div style="font-size:0.72rem;color:var(--muted)">';
    html += '出现' + s.count + '次 · 均分' + s.avgScore + ' · 胆' + s.danCount + ' · 排' + s.excludeCount;
    html += '</div>';
    html += '<div style="font-size:0.7rem;color:var(--muted);margin-top:0.15rem">' + s.reasons.slice(0, 4).join('；') + '</div>';
    html += '</div>';
    html += '</div>';

    // 各组详情小标签
    html += '<div style="text-align:right;min-width:80px">';
    for (var j = 0; j < s.groupDetails.length && j < 4; j++) {
      var gd = s.groupDetails[j];
      var gdColor = gd.isDan ? 'var(--gold)' : gd.isExclude ? 'var(--accent4)' : gd.score > 0 ? 'var(--accent3)' : 'var(--muted)';
      html += '<div style="font-size:0.7rem;color:' + gdColor + '">第' + gd.groupIndex + '组 ' + (gd.score > 0 ? '+' : '') + gd.score + '</div>';
    }
    if (s.groupDetails.length > 4) {
      html += '<div style="font-size:0.65rem;color:var(--muted)">+' + (s.groupDetails.length - 4) + '组</div>';
    }
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';

  // 总结
  var topNums = multiResult.filter(function(s){return s.finalScore >= 10 && s.danCount < Math.min(2, s.count) && s.excludeCount <= s.count / 2;}).slice(0, 10);
  var danNums = multiResult.filter(function(s){return s.danCount >= Math.min(2, s.count) && s.finalScore > 0;});
  var excludeNums = multiResult.filter(function(s){return s.excludeCount > s.count / 2 || (s.excludeCount > 0 && s.finalScore < 0);});

  html += '<div style="background:var(--bg2);border:1px solid var(--rule);border-radius:8px;padding:0.75rem">';
  html += '<div style="font-weight:700;color:var(--accent);margin-bottom:0.5rem">多组综合总结</div>';

  if (danNums.length > 0) {
    html += '<div style="margin-bottom:0.4rem"><span style="color:var(--gold);font-weight:700">多组胆码：</span>';
    for (var i = 0; i < danNums.length; i++) {
      html += '<span class="ball gold" style="display:inline-block;width:24px;height:24px;font-size:0.7rem;line-height:24px;margin-right:0.3rem">' + (danNums[i].num < 10 ? '0' + danNums[i].num : danNums[i].num) + '</span>';
    }
    html += '</div>';
  }

  if (topNums.length > 0) {
    html += '<div style="margin-bottom:0.4rem"><span style="color:var(--accent3);font-weight:700">重点关注：</span>';
    for (var i = 0; i < topNums.length; i++) {
      html += '<span class="ball red" style="display:inline-block;width:24px;height:24px;font-size:0.7rem;line-height:24px;margin-right:0.3rem">' + (topNums[i].num < 10 ? '0' + topNums[i].num : topNums[i].num) + '</span>';
    }
    html += '</div>';
  }

  if (excludeNums.length > 0) {
    html += '<div style="margin-bottom:0.4rem"><span style="color:var(--accent4);font-weight:700">多组排除：</span>';
    for (var i = 0; i < excludeNums.length; i++) {
      html += '<span class="ball gray" style="display:inline-block;width:24px;height:24px;font-size:0.7rem;line-height:24px;margin-right:0.3rem">' + (excludeNums[i].num < 10 ? '0' + excludeNums[i].num : excludeNums[i].num) + '</span>';
    }
    html += '</div>';
  }

  html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.5rem">多组票花综合权重 = 平均得分 × (1 + 出现次数×0.15) + 胆码次数×2 − 排除次数×3。出现次数越多、得分越高的号码排名越靠前。</div>';
  html += '</div>';

  container.innerHTML = html;
}

// ==================== 主入口 ====================
function renderFlowerAnalysis(type) {
  var flowerInput, numInput, resultId, lotteryType;
  if (type === 'dlt') {
    flowerInput = document.getElementById('dlt-flower-input');
    numInput = document.getElementById('dlt-flower-numbers');
    resultId = 'dlt-flower-result';
    lotteryType = 'dlt';
  } else if (type === 'pl3') {
    flowerInput = document.getElementById('pl3-flower-input');
    numInput = document.getElementById('pl3-flower-numbers');
    resultId = 'pl3-flower-result';
    lotteryType = 'pl3';
  } else if (type === 'pl5') {
    flowerInput = document.getElementById('pl5-flower-input');
    numInput = document.getElementById('pl5-flower-numbers');
    resultId = 'pl5-flower-result';
    lotteryType = 'pl5';
  }

  if (!flowerInput || !numInput) return;

  var flowerStr = flowerInput.value;
  var numStr = numInput.value;

  if (!flowerStr.trim() && !numStr.trim()) {
    alert('请输入票花代码和号码');
    return;
  }
  if (!numStr.trim()) {
    alert('请输入号码');
    return;
  }

  var groups = parseGroups(flowerStr, numStr);
  if (groups.length === 0) {
    alert('请输入有效的票花和号码');
    return;
  }

  if (groups.length === 1) {
    var g = groups[0];
    var flowerInfo = parseFlowerString(g.flower);
    var scores = scoreNumbersByFlower(g.numbers, flowerInfo, lotteryType);
    renderSingleFlowerResult(resultId, flowerInfo, scores, lotteryType, g);
    return;
  }

  var multiResult = analyzeMultiGroups(groups, lotteryType);
  renderMultiFlowerResult(resultId, groups, multiResult, lotteryType);
}
