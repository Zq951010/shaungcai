/**
 * 票花自主分析引擎
 * 支持大乐透(DLT)、排列三(PL3)、排列五(PL5)
 * 根据票花字母含义，分析输入号码中哪些有潜力
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

// ==================== 号码评分 ====================
function scoreNumbersByFlower(numbers, flowerInfo, lotteryType) {
  var scores = [];
  var totalFlowerScore = 0;
  for (var i = 0; i < flowerInfo.length; i++) {
    totalFlowerScore += Math.abs(flowerInfo[i].score);
  }

  for (var i = 0; i < numbers.length; i++) {
    var num = numbers[i];
    var numScore = 0;
    var reasons = [];
    var isDan = false;
    var isExclude = false;

    for (var j = 0; j < flowerInfo.length; j++) {
      var f = flowerInfo[j];
      var match = false;

      // 根据票花含义匹配号码特征
      switch (f.char) {
        case 'A': case 'a': // 低位正确、有胆
          if (lotteryType === 'dlt' && num <= 12) match = true;
          else if (lotteryType === 'pl3' && num <= 3) match = true;
          else if (lotteryType === 'pl5' && num <= 2) match = true;
          break;
        case 'C': case 'c': // 肯定出号、必出、稳胆
          match = true; isDan = true;
          break;
        case 'E': case 'e': // 邻号±1
          // 需要结合上期号码判断，这里先标记为潜力
          match = true;
          reasons.push('邻号潜力（±1范围）');
          break;
        case 'F': case 'f': // 首选、第一胆、重点
          match = true; isDan = true;
          break;
        case 'J': case 'j': // 正确、数字4
          if (num === 4 || num % 10 === 4) match = true;
          break;
        case 'L': case 'l': // 正确、稳号、必出
          match = true; isDan = true;
          break;
        case 'N': case 'n': // 接近、邻号、差1
          match = true;
          reasons.push('邻号潜力（差1）');
          break;
        case 'Q': case 'q': // 胆码、关键号
          match = true; isDan = true;
          break;
        case 'T': case 't': // 错误、放弃
          isExclude = true;
          break;
        case 'V': case 'v': // 重要号、核心胆
          match = true; isDan = true;
          break;
        case 'W': case 'w': // 重要、重点号
          match = true;
          break;
        case 'X': case 'x': // 放弃、排除
          isExclude = true;
          break;
        case 'Y': case 'y': // 重号、上期号
          match = true;
          reasons.push('重号潜力');
          break;
        case 'Z': case 'z': // 重点、核心、必防
          match = true; isDan = true;
          break;
        case '*': // 有号、出号
          match = true;
          break;
        case 'D': case 'd': // 尾数
          match = true;
          reasons.push('尾数关注');
          break;
        case 'H': case 'h': // 中间数
          if (lotteryType === 'dlt' && num >= 13 && num <= 23) match = true;
          else if ((lotteryType === 'pl3' || lotteryType === 'pl5') && num >= 4 && num <= 6) match = true;
          break;
        case 'M': case 'm': // 大号
          if (lotteryType === 'dlt' && num >= 24) match = true;
          else if (lotteryType === 'pl3' && num >= 7) match = true;
          else if (lotteryType === 'pl5' && num >= 7) match = true;
          break;
        case 'K': case 'k': // 小号
          if (lotteryType === 'dlt' && num <= 12) match = true;
          else if ((lotteryType === 'pl3' || lotteryType === 'pl5') && num <= 3) match = true;
          break;
        case 'O': case 'o': // 0号
          if (num === 0 || num === 10 || num === 20 || num === 30) match = true;
          break;
        case 'G': case 'g': // 数字7
          if (num === 7 || num === 17 || num === 27) match = true;
          break;
        case 'S': case 's': // 数字7
          if (num === 7 || num === 17 || num === 27) match = true;
          break;
        case 'R': case 'r': // 大号、跨度
          if (lotteryType === 'dlt' && num >= 25) match = true;
          break;
        case 'B': case 'b': // 前后位置
          match = true;
          reasons.push('位置关注');
          break;
        case 'I': case 'i': // 区间内
          match = true;
          reasons.push('区间范围内');
          break;
        case 'P': case 'p': // 后位
          if (lotteryType === 'pl3' || lotteryType === 'pl5') {
            if (i === numbers.length - 1) match = true;
          }
          break;
        case 'U': case 'u': // 最后、末尾
          if (i === numbers.length - 1) match = true;
          break;
      }

      if (match) {
        numScore += f.score;
        if (reasons.indexOf(f.meaning) < 0 && reasons.length < 3) {
          reasons.push(f.meaning);
        }
      }
    }

    // 综合评分计算
    var finalScore = numScore;
    var level = '一般';
    var levelColor = 'var(--muted)';

    if (isExclude) {
      level = '建议排除';
      levelColor = 'var(--accent4)';
      finalScore -= 10;
    } else if (isDan) {
      level = '高潜力（胆码）';
      levelColor = 'var(--gold)';
      finalScore += 5;
    } else if (finalScore >= 15) {
      level = '高潜力';
      levelColor = 'var(--accent3)';
    } else if (finalScore >= 8) {
      level = '较有潜力';
      levelColor = 'var(--accent)';
    } else if (finalScore > 0) {
      level = '略有潜力';
      levelColor = 'var(--accent2)';
    } else if (finalScore <= 0) {
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
      reasons: reasons.length > 0 ? reasons : ['票花未明确指向']
    });
  }

  // 按分数排序
  scores.sort(function(a, b) { return b.score - a.score; });
  return scores;
}

// ==================== 渲染票花分析结果 ====================
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

  var flowerStr = flowerInput.value.trim();
  var numStr = numInput.value.trim();

  if (!flowerStr) {
    alert('请输入票花代码');
    return;
  }
  if (!numStr) {
    alert('请输入号码');
    return;
  }

  var numbers = numStr.split(/[,，\s]+/).map(function(s) {
    return parseInt(s.trim(), 10);
  }).filter(function(n) {
    return !isNaN(n) && n >= 0;
  });

  if (numbers.length === 0) {
    alert('请输入有效的号码');
    return;
  }

  var flowerInfo = parseFlowerString(flowerStr);
  var scores = scoreNumbersByFlower(numbers, flowerInfo, lotteryType);

  var container = document.getElementById(resultId);
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

  html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.5rem">';
  html += '票花分析仅供参考，结合走势数据和冷热号分析可提高准确率。';
  html += '</div>';
  html += '</div>';

  container.innerHTML = html;
}
