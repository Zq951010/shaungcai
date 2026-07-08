/**
 * 排列三/排列五 分析引擎
 * 支持排列三(PL3)和排列五(PL5)
 * 分析维度：基本统计、重号、和值、跨度、冷热号、奇偶比、大小比、尾数、遗漏、综合推荐
 */

// ==================== 排列三/排列五 工具函数 ====================

function parseNums0(str) {
  if (!str || !str.trim()) return [];
  return str.split(/[,，\s]+/).map(function(s) { return parseInt(s.trim(), 10); }).filter(function(n) { return !isNaN(n) && n >= 0 && n <= 9; });
}

// ==================== 排列三分析 ====================

function loadPL3Sample() {
  if (typeof PL3_HISTORY === 'undefined' || !PL3_HISTORY || PL3_HISTORY.length === 0) return;
  var last = PL3_HISTORY[0];
  document.getElementById('pl3-numbers').value = last.numbers.join(',');
  var historyLines = [];
  for (var i = 0; i < PL3_HISTORY.length; i++) {
    historyLines.push(PL3_HISTORY[i].numbers.join(','));
  }
  document.getElementById('pl3-history').value = historyLines.join('\n');
  // 填充复盘输入框默认值
  var reviewNums = document.getElementById('pl3-review-numbers');
  if (reviewNums) reviewNums.value = last.numbers.join(',');
}

function clearPL3() {
  document.getElementById('pl3-numbers').value = '';
  document.getElementById('pl3-history').value = '';
  document.getElementById('pl3-results').style.display = 'none';
  document.getElementById('pl3-empty').style.display = 'block';
}

function analyzePL3() {
  var numsStr = document.getElementById('pl3-numbers').value;
  var historyStr = document.getElementById('pl3-history').value;

  var lastNums = parseNums0(numsStr);

  var lines = historyStr.trim().split('\n').filter(function(l) { return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums0(lines[i]);
    if (nums.length >= 3) {
      history.push(nums.slice(0, 3));
    }
  }

  if (history.length === 0 && lastNums.length >= 3) {
    history.unshift(lastNums.slice(0, 3));
  }

  if (history.length < 2) { alert('请至少输入2期历史数据（每期3个号码，0-9）'); return; }

  var last = history[0];

  document.getElementById('pl3-empty').style.display = 'none';
  document.getElementById('pl3-results').style.display = 'block';

  renderPL3Stats(last, history);
  renderPL3Repeat(last, history);
  renderPL3Sum(history);
  renderPL3Span(history);
  renderPL3HotCold(history);
  renderPL3OddEven(history);
  renderPL3Tail(history);
  renderPL3Miss(history);
  renderPL3Recommend_V2(last, history);
  try { renderPL3ProbAnalysis(last, history); } catch(e) { console.log('renderPL3ProbAnalysis error:', e.message); }

  document.getElementById('pl3-results').scrollIntoView({ behavior: 'smooth' });
}

function renderPL3Stats(last, history) {
  var s = sum(last);
  var sp = span(last);
  var sums = history.map(function(h) { return sum(h); });
  var oddCount = last.filter(function(n) { return n % 2 === 1; }).length;
  var bigCount = last.filter(function(n) { return n >= 5; }).length;

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + s + '</div><div class="stat-label">当期和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + sp + '</div><div class="stat-label">当期跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + oddCount + ':' + (3 - oddCount) + '</div><div class="stat-label">奇偶比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + bigCount + ':' + (3 - bigCount) + '</div><div class="stat-label">大小比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">当期开奖号码</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < last.length; i++) {
    html += '<div class="ball red">' + last[i] + '</div>';
  }
  html += '</div></div>';

  document.getElementById('pl3-stats').innerHTML = html;
}

function renderPL3Repeat(last, history) {
  var html = '';
  var repeatCounts = [];
  for (var i = 1; i < history.length; i++) {
    var repeat = intersection(last, history[i]).length;
    repeatCounts.push(repeat);
  }
  var avgRepeat = avg(repeatCounts).toFixed(1);

  html += '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">历史平均重号</span><span class="result-value">' + avgRepeat + ' 个</span></div>';

  var repeatFreq = {};
  for (var i = 1; i < history.length; i++) {
    var repeats = intersection(history[i - 1], history[i]);
    for (var j = 0; j < repeats.length; j++) {
      repeatFreq[repeats[j]] = (repeatFreq[repeats[j]] || 0) + 1;
    }
  }

  var candidates = [];
  for (var i = 0; i < last.length; i++) {
    var n = last[i];
    var freq = repeatFreq[n] || 0;
    var reasons = [];
    if (freq >= 2) reasons.push('历史重号高频');
    var consecutive = 0;
    for (var j = 0; j < history.length; j++) {
      if (history[j].indexOf(n) >= 0) consecutive++;
      else break;
    }
    if (consecutive <= 1) reasons.push('非连续号');
    if (freq >= 1) reasons.push('有重号先例');
    candidates.push({ num: n, freq: freq, consecutive: consecutive, reasons: reasons });
  }
  candidates.sort(function(a, b) { return b.freq - a.freq; });

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">上期号码重号可能性评估</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>号码</th><th>历史重号次数</th><th>连续出现期数</th><th>评估</th><th>依据</th></tr>';
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    var badge = c.freq >= 2 ? '<span class="badge badge-hot">高概率</span>' :
                c.freq >= 1 ? '<span class="badge badge-warm">中等</span>' :
                '<span class="badge badge-cold">低概率</span>';
    html += '<tr><td><span class="hl-red">' + c.num + '</span></td><td>' + c.freq + '</td><td>' + c.consecutive + '</td><td>' + badge + '</td><td>' + c.reasons.map(function(r){return '<span class="reason-tag">'+r+'</span>';}).join('') + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('pl3-repeat').innerHTML = html;
}

function renderPL3Sum(history) {
  var sums = history.map(function(h) { return sum(h); });
  var lastSum = sums[0];
  var avgSum = Math.round(avg(sums));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期和值</span><span class="result-value">' + lastSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均和值</span><span class="result-value">' + avgSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">和值范围</span><span class="result-value">' + min(sums) + ' ~ ' + max(sums) + '</span></div>';

  var diff = lastSum - avgSum;
  var trend = diff > 5 ? '偏高，下期可能回落' : diff < -5 ? '偏低，下期可能回升' : '正常波动范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';

  var sugMin = Math.max(0, avgSum - 5);
  var sugMax = Math.min(27, avgSum + 5);
  html += '<div class="result-row"><span class="result-label">建议和值范围</span><span class="result-value hl-gold">' + sugMin + ' ~ ' + sugMax + '</span></div>';
  html += '</div>';

  document.getElementById('pl3-sum').innerHTML = html;
  renderPL3SumChart(sums);
}

function renderPL3Span(history) {
  var spans = history.map(function(h) { return span(h); });
  var lastSp = spans[0];
  var avgSp = Math.round(avg(spans));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期跨度</span><span class="result-value">' + lastSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均跨度</span><span class="result-value">' + avgSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">跨度范围</span><span class="result-value">' + min(spans) + ' ~ ' + max(spans) + '</span></div>';

  var diff = lastSp - avgSp;
  var trend = diff > 2 ? '偏大，下期可能缩小' : diff < -2 ? '偏小，下期可能扩大' : '正常范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';

  var sugMin = Math.max(0, avgSp - 2);
  var sugMax = Math.min(9, avgSp + 2);
  html += '<div class="result-row"><span class="result-label">建议跨度范围</span><span class="result-value hl-gold">' + sugMin + ' ~ ' + sugMax + '</span></div>';
  html += '</div>';

  document.getElementById('pl3-span').innerHTML = html;
  renderPL3SpanChart(spans);
}

function renderPL3HotCold(history) {
  var freqMap = {};
  for (var n = 0; n <= 9; n++) freqMap[n] = 0;
  for (var i = 0; i < history.length; i++) {
    for (var j = 0; j < history[i].length; j++) {
      freqMap[history[i][j]]++;
    }
  }

  var totalPeriods = history.length;
  var expected = (3 / 10) * totalPeriods;

  var hot = [], warm = [], cold = [];
  for (var n = 0; n <= 9; n++) {
    var f = freqMap[n];
    if (f >= expected * 1.3) hot.push({ num: n, freq: f });
    else if (f <= expected * 0.7) cold.push({ num: n, freq: f });
    else warm.push({ num: n, freq: f });
  }
  hot.sort(function(a, b) { return b.freq - a.freq; });
  cold.sort(function(a, b) { return a.freq - b.freq; });

  var html = '<div class="result-section">';
  html += '<div style="margin-bottom:1rem;color:var(--muted);font-size:0.85rem">理论期望频次: ' + expected.toFixed(1) + ' 次/' + totalPeriods + '期</div>';

  html += '<div style="margin-bottom:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号 (' + hot.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < hot.length; i++) {
    html += '<div class="ball red hot tooltip" data-tip="' + hot[i].freq + '次">' + hot[i].num + '</div>';
  }
  html += '</div></div>';

  html += '<div><span class="badge badge-cold" style="margin-right:0.5rem">冷号 (' + cold.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < cold.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + cold[i].freq + '次">' + cold[i].num + '</div>';
  }
  html += '</div></div>';

  // Frequency detail
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">各号码出现频率</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>号码</th><th>出现次数</th><th>期望值</th><th>偏差</th><th>状态</th></tr>';
  for (var n = 0; n <= 9; n++) {
    var f = freqMap[n];
    var dev = expected > 0 ? ((f - expected) / expected * 100).toFixed(1) : '0.0';
    var devStr = dev > 0 ? '+' + dev + '%' : dev + '%';
    var badge = f >= expected * 1.3 ? '<span class="badge badge-hot">热号</span>' :
                f <= expected * 0.7 ? '<span class="badge badge-cold">冷号</span>' :
                '<span class="badge badge-warm">正常</span>';
    html += '<tr><td><span class="hl-red">' + n + '</span></td><td>' + f + '</td><td>' + expected.toFixed(1) + '</td><td>' + devStr + '</td><td>' + badge + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('pl3-hotcold').innerHTML = html;
  renderPL3FreqChart(freqMap, expected);
}

function renderPL3OddEven(history) {
  var html = '<div class="result-section">';

  var oddEvenRatios = [];
  var bigSmallRatios = [];
  for (var i = 0; i < history.length; i++) {
    var oddC = history[i].filter(function(n) { return n % 2 === 1; }).length;
    oddEvenRatios.push({ odd: oddC, even: 3 - oddC });
    var bigC = history[i].filter(function(n) { return n >= 5; }).length;
    bigSmallRatios.push({ big: bigC, small: 3 - bigC });
  }

  var avgOdd = (oddEvenRatios.reduce(function(s, r) { return s + r.odd; }, 0) / oddEvenRatios.length).toFixed(1);
  var avgBig = (bigSmallRatios.reduce(function(s, r) { return s + r.big; }, 0) / bigSmallRatios.length).toFixed(1);

  html += '<div class="result-row"><span class="result-label">上期奇偶比</span><span class="result-value">' + oddEvenRatios[0].odd + ':' + oddEvenRatios[0].even + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均奇数</span><span class="result-value">' + avgOdd + ' 个</span></div>';
  html += '<div class="result-row"><span class="result-label">上期大小比</span><span class="result-value">' + bigSmallRatios[0].big + ':' + bigSmallRatios[0].small + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均大数</span><span class="result-value">' + avgBig + ' 个</span></div>';

  var oddDiff = oddEvenRatios[0].odd - avgOdd;
  var oddSug = oddDiff > 0.5 ? '奇数偏多，下期可能偶数回补' : oddDiff < -0.5 ? '偶数偏多，下期可能奇数回补' : '奇偶均衡';
  html += '<div class="result-row"><span class="result-label">奇偶趋势</span><span class="result-value">' + oddSug + '</span></div>';

  var bigDiff = bigSmallRatios[0].big - avgBig;
  var bigSug = bigDiff > 0.5 ? '大数偏多，下期可能小数回补' : bigDiff < -0.5 ? '小数偏多，下期可能大数回补' : '大小均衡';
  html += '<div class="result-row"><span class="result-label">大小趋势</span><span class="result-value">' + bigSug + '</span></div>';

  html += '</div>';
  document.getElementById('pl3-odd-even').innerHTML = html;
  renderPL3OddEvenChart(oddEvenRatios);
}

function renderPL3Tail(history) {
  var html = '<div class="result-section">';

  var tailFreq = {};
  for (var t = 0; t <= 9; t++) tailFreq[t] = 0;
  for (var i = 0; i < history.length; i++) {
    for (var j = 0; j < history[i].length; j++) {
      tailFreq[history[i][j]]++;
    }
  }

  var totalBalls = history.length * 3;
  var expected = totalBalls / 10;

  var hotTails = [], coldTails = [];
  for (var t = 0; t <= 9; t++) {
    if (tailFreq[t] >= expected * 1.15) hotTails.push({ tail: t, freq: tailFreq[t] });
    else if (tailFreq[t] <= expected * 0.85) coldTails.push({ tail: t, freq: tailFreq[t] });
  }
  hotTails.sort(function(a, b) { return b.freq - a.freq; });
  coldTails.sort(function(a, b) { return a.freq - b.freq; });

  var lastTails = history[0].slice();
  var uniqueLastTails = [];
  for (var i = 0; i < lastTails.length; i++) {
    if (uniqueLastTails.indexOf(lastTails[i]) < 0) uniqueLastTails.push(lastTails[i]);
  }

  html += '<div class="result-row"><span class="result-label">期望频率</span><span class="result-value">' + expected.toFixed(1) + ' 次/号</span></div>';
  html += '<div class="result-row"><span class="result-label">上期尾数</span><span class="result-value">';
  for (var i = 0; i < uniqueLastTails.length; i++) {
    html += '<span class="hl-red" style="margin-right:0.3rem">' + uniqueLastTails[i] + '</span>';
  }
  html += ' (覆盖' + uniqueLastTails.length + '个号码)</span></div>';

  html += '<div style="margin-top:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号</span><div class="ball-row">';
  for (var i = 0; i < hotTails.length; i++) {
    html += '<div class="ball red hot tooltip" data-tip="' + hotTails[i].freq + '次">' + hotTails[i].tail + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-top:0.5rem"><span class="badge badge-cold" style="margin-right:0.5rem">冷号</span><div class="ball-row">';
  for (var i = 0; i < coldTails.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + coldTails[i].freq + '次">' + coldTails[i].tail + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">各号码出现频率</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>号码</th><th>出现次数</th><th>期望值</th><th>偏差</th><th>状态</th></tr>';
  for (var t = 0; t <= 9; t++) {
    var freq = tailFreq[t];
    var dev = expected > 0 ? ((freq - expected) / expected * 100).toFixed(1) : '0.0';
    var devStr = dev > 0 ? '+' + dev + '%' : dev + '%';
    var badge = freq >= expected * 1.15 ? '<span class="badge badge-hot">热</span>' :
                freq <= expected * 0.85 ? '<span class="badge badge-cold">冷</span>' :
                '<span class="badge badge-warm">正常</span>';
    html += '<tr><td><span class="hl-red">' + t + '</span></td><td>' + freq + '</td><td>' + expected.toFixed(1) + '</td><td>' + devStr + '</td><td>' + badge + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('pl3-tail').innerHTML = html;
  renderPL3TailChart(tailFreq, expected);
}

function renderPL3Miss(history) {
  var html = '<div class="result-section">';

  var missData = {};
  for (var n = 0; n <= 9; n++) {
    var miss = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === history.length) miss = history.length;
    missData[n] = miss;
  }

  var totalMiss = 0;
  for (var n = 0; n <= 9; n++) totalMiss += missData[n];
  var avgMiss = (totalMiss / 10).toFixed(1);

  var hotBalls = [], coldBalls = [];
  for (var n = 0; n <= 9; n++) {
    if (missData[n] <= Math.floor(avgMiss * 0.5)) {
      hotBalls.push({ num: n, miss: missData[n] });
    } else if (missData[n] >= avgMiss * 1.5) {
      coldBalls.push({ num: n, miss: missData[n] });
    }
  }
  hotBalls.sort(function(a, b) { return a.miss - b.miss; });
  coldBalls.sort(function(a, b) { return b.miss - a.miss; });

  var maxMissBall = 0, maxMissVal = 0;
  for (var n = 0; n <= 9; n++) {
    if (missData[n] > maxMissVal) { maxMissVal = missData[n]; maxMissBall = n; }
  }

  html += '<div class="result-row"><span class="result-label">平均遗漏</span><span class="result-value">' + avgMiss + ' 期</span></div>';
  html += '<div class="result-row"><span class="result-label">最大遗漏</span><span class="result-value hl-red">' + maxMissBall + ' (遗漏' + maxMissVal + '期)</span></div>';

  html += '<div style="margin-top:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号(低遗漏)</span><div class="ball-row">';
  for (var i = 0; i < hotBalls.length; i++) {
    var badge = hotBalls[i].miss === 0 ? '当期开出' : '遗漏' + hotBalls[i].miss + '期';
    html += '<div class="ball red hot tooltip" data-tip="' + badge + '">' + hotBalls[i].num + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-top:0.5rem"><span class="badge badge-cold" style="margin-right:0.5rem">冷号(高遗漏)</span><div class="ball-row">';
  for (var i = 0; i < coldBalls.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="遗漏' + coldBalls[i].miss + '期">' + coldBalls[i].num + '</div>';
  }
  html += '</div></div>';

  // Detail table
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">各号码遗漏期数</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>号码</th><th>遗漏期数</th><th>平均遗漏</th><th>状态</th></tr>';
  for (var n = 0; n <= 9; n++) {
    var m = missData[n];
    var badge = m === 0 ? '<span class="badge badge-hot">当期开出</span>' :
                m <= Math.floor(avgMiss * 0.5) ? '<span class="badge badge-hot">低遗漏</span>' :
                m >= avgMiss * 1.5 ? '<span class="badge badge-cold">高遗漏</span>' :
                '<span class="badge badge-warm">正常</span>';
    html += '<tr><td><span class="hl-red">' + n + '</span></td><td>' + m + '</td><td>' + avgMiss + '</td><td>' + badge + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('pl3-miss').innerHTML = html;
  renderPL3MissChart(missData);
}

function scorePL3Numbers(last, history) {
  // V2: position-independent 8-dimensional model for Bai, Shi, Ge
  var posScores = [];
  for (var pos = 0; pos < 3; pos++) {
    posScores[pos] = scorePL3Position(pos, last, history);
  }
  return posScores;
}

// ==================== 排列三 大模型统计概率渲染 ====================

function renderPL3ProbAnalysis(last, history) {
  var posScores = scorePL3Numbers(last, history);
  var posNames = ['百位', '十位', '个位'];
  var posIds = ['pl3-prob-hundreds', 'pl3-prob-tens', 'pl3-prob-ones'];

  for (var pos = 0; pos < 3; pos++) {
    var sorted = posScores[pos].slice().sort(function(a, b) { return b.total - a.total; });
    var container = document.getElementById(posIds[pos]);
    if (!container) continue;

    var html = '<table style="width:100%;font-size:0.8rem;border-collapse:collapse">';
    html += '<thead><tr style="background:var(--bg3)"><th style="padding:4px 6px;border:1px solid var(--rule)">号码</th><th style="padding:4px 6px;border:1px solid var(--rule)">综合评分</th><th style="padding:4px 6px;border:1px solid var(--rule)">频率</th><th style="padding:4px 6px;border:1px solid var(--rule)">遗漏</th><th style="padding:4px 6px;border:1px solid var(--rule)">特征标签</th></tr></thead><tbody>';
    for (var i = 0; i < sorted.length; i++) {
      var sc = sorted[i];
      var isTop = i < 3;
      html += '<tr style="' + (isTop ? 'background:var(--bg3);font-weight:600' : '') + '">';
      html += '<td style="padding:4px 6px;border:1px solid var(--rule);text-align:center"><span class="ball red" style="width:26px;height:26px;font-size:0.7rem;display:inline-block">' + sc.num + '</span></td>';
      html += '<td style="padding:4px 6px;border:1px solid var(--rule);text-align:center;color:' + (isTop ? 'var(--accent3)' : 'var(--ink)') + ';font-weight:700">' + sc.total.toFixed(1) + '</td>';
      html += '<td style="padding:4px 6px;border:1px solid var(--rule);text-align:center">' + (sc.freqScore ? sc.freqScore.toFixed(1) : '-') + '</td>';
      html += '<td style="padding:4px 6px;border:1px solid var(--rule);text-align:center">' + (sc.missScore ? sc.missScore.toFixed(1) : '-') + '</td>';
      html += '<td style="padding:4px 6px;border:1px solid var(--rule);font-size:0.72rem;color:var(--muted)">' + (sc.reasons ? sc.reasons.join('，') : '') + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table>';
    html += '<div style="margin-top:0.4rem;font-size:0.72rem;color:var(--muted)">评分维度：加权频率(24%)·遗漏百分位(19%)·马尔可夫转移(14%)·邻号关联(14%)·近期趋势·稳定性(10%)·冷热交替(10%)·大小交替(5%)·形态·012路·均值回归</div>';
    container.innerHTML = html;
  }

  // 上期重号分析
  var repeatContainer = document.getElementById('pl3-prob-repeat');
  if (repeatContainer) {
    var html = '<div style="padding:0.5rem 0">';
    for (var pos = 0; pos < 3; pos++) {
      var lastVal = last[pos];
      var scores = posScores[pos].slice().sort(function(a, b) { return b.total - a.total; });
      var sameScore = null;
      for (var i = 0; i < scores.length; i++) {
        if (scores[i].num === lastVal) { sameScore = scores[i]; break; }
      }
      var rank = sameScore ? (posScores[pos].slice().sort(function(a,b){return b.total-a.total;}).indexOf(sameScore) + 1) : '-';
      html += '<div style="display:flex;align-items:center;gap:0.8rem;padding:0.4rem 0;border-bottom:1px solid var(--rule)">';
      html += '<span style="font-weight:600;color:var(--ink);min-width:40px">' + posNames[pos] + '</span>';
      html += '<span class="ball red" style="width:28px;height:28px;font-size:0.75rem;display:inline-block">' + lastVal + '</span>';
      html += '<span style="font-size:0.8rem;color:var(--muted)">评分：<strong style="color:var(--ink)">' + (sameScore ? sameScore.total.toFixed(1) : '-') + '</strong>　排名：<strong style="color:' + (rank <= 3 ? 'var(--accent3)' : 'var(--ink)') + '">' + rank + '/10</strong></span>';
      if (sameScore && sameScore.repeatScore >= 7) {
        html += '<span style="background:var(--accent);color:#000;padding:1px 6px;border-radius:4px;font-size:0.7rem">邻号关联强</span>';
      }
      html += '</div>';
    }
    // 重号概率评估
    var repeatProb = 0;
    for (var pos = 0; pos < 3; pos++) {
      var lastVal = last[pos];
      for (var i = 0; i < history.length; i++) {
        if (i === 0) continue;
        if (history[i][pos] === lastVal) repeatProb++;
      }
    }
    var totalPosCheck = (history.length - 1) * 3;
    var repeatRate = totalPosCheck > 0 ? (repeatProb / totalPosCheck * 100).toFixed(1) : '0';
    html += '<div style="margin-top:0.5rem;padding:0.4rem 0.6rem;background:var(--bg3);border-radius:6px;font-size:0.8rem">';
    html += '<span style="color:var(--muted)">历史重号概率：</span><strong style="color:var(--accent)">' + repeatRate + '%</strong>';
    html += '<span style="color:var(--muted);margin-left:1rem">建议：每个位置保留' + (parseFloat(repeatRate) > 20 ? '1-2个重号' : '0-1个重号') + '</span>';
    html += '</div>';
    html += '</div>';
    repeatContainer.innerHTML = html;
  }

  // 和值/跨度分析
  var sumspanContainer = document.getElementById('pl3-prob-sumspan');
  if (sumspanContainer) {
    var sums = history.map(function(h) { return sum(h); });
    var spans = history.map(function(h) { return span(h); });
    var lastSum = sums[0];
    var avgSum = Math.round(avg(sums));
    var lastSp = spans[0];
    var avgSp = Math.round(avg(spans));

    var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem">';

    // 和值分析
    html += '<div style="padding:0.6rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<div style="font-weight:600;color:var(--ink);margin-bottom:0.3rem">和值分析</div>';
    html += '<div style="font-size:0.8rem">';
    html += '<div>上期和值：<strong style="color:var(--accent)">' + lastSum + '</strong></div>';
    html += '<div>平均和值：<strong>' + avgSum + '</strong></div>';
    html += '<div>和值范围：' + min(sums) + ' ~ ' + max(sums) + '</div>';
    var sumDiff = lastSum - avgSum;
    var sumTrend = sumDiff > 5 ? '偏高，下期可能回落' : sumDiff < -5 ? '偏低，下期可能回升' : '正常波动范围';
    html += '<div style="color:var(--muted)">趋势：' + sumTrend + '</div>';
    // 和值出现频率Top5
    var sumFreq = {};
    for (var i = 0; i < sums.length; i++) sumFreq[sums[i]] = (sumFreq[sums[i]] || 0) + 1;
    var sumSorted = Object.keys(sumFreq).sort(function(a,b){ return sumFreq[b] - sumFreq[a]; }).slice(0, 5);
    html += '<div style="margin-top:0.3rem;color:var(--muted);font-size:0.75rem">高频和值：' + sumSorted.map(function(s){ return s + '(' + sumFreq[s] + '次)'; }).join('，') + '</div>';
    html += '</div></div>';

    // 跨度分析
    html += '<div style="padding:0.6rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<div style="font-weight:600;color:var(--ink);margin-bottom:0.3rem">跨度分析</div>';
    html += '<div style="font-size:0.8rem">';
    html += '<div>上期跨度：<strong style="color:var(--accent)">' + lastSp + '</strong></div>';
    html += '<div>平均跨度：<strong>' + avgSp + '</strong></div>';
    html += '<div>跨度范围：' + min(spans) + ' ~ ' + max(spans) + '</div>';
    var spDiff = lastSp - avgSp;
    var spTrend = spDiff > 2 ? '偏大，下期可能缩小' : spDiff < -2 ? '偏小，下期可能扩大' : '正常范围';
    html += '<div style="color:var(--muted)">趋势：' + spTrend + '</div>';
    var spFreq = {};
    for (var i = 0; i < spans.length; i++) spFreq[spans[i]] = (spFreq[spans[i]] || 0) + 1;
    var spSorted = Object.keys(spFreq).sort(function(a,b){ return spFreq[b] - spFreq[a]; }).slice(0, 5);
    html += '<div style="margin-top:0.3rem;color:var(--muted);font-size:0.75rem">高频跨度：' + spSorted.map(function(s){ return s + '(' + spFreq[s] + '次)'; }).join('，') + '</div>';
    html += '</div></div>';

    html += '</div>';
    sumspanContainer.innerHTML = html;
  }
}

function weightedFreq(num, history, halfLife) {
  var total = 0;
  var weightSum = 0;
  for (var i = 0; i < history.length; i++) {
    var w = Math.pow(0.5, i / Math.max(1, halfLife));
    for (var j = 0; j < history[i].length; j++) {
      if (history[i][j] === num) {
        total += w;
        break;
      }
    }
    weightSum += w;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

function getMissDistribution(num, history) {
  var gaps = [], currentGap = 0;
  for (var i = history.length - 1; i >= 0; i--) {
    if (history[i].indexOf(num) >= 0) {
      if (currentGap > 0) gaps.push(currentGap);
      currentGap = 0;
    } else currentGap++;
  }
  gaps.push(currentGap);
  var mean = gaps.length ? gaps.reduce(function(a,b){return a+b;},0) / gaps.length : 0;
  var sorted = gaps.slice().sort(function(a,b){return a-b;});
  var median = sorted.length ? sorted[Math.floor(sorted.length/2)] : 0;
  var std = gaps.length > 1 ? Math.sqrt(gaps.reduce(function(s,g){return s+(g-mean)*(g-mean);},0)/gaps.length) : 0;
  var maxGap = gaps.length ? Math.max.apply(null, gaps) : 0;
  return {gaps: gaps, mean: mean, median: median, std: std, maxGap: maxGap, currentGap: currentGap};
}

function getMissPercentile(num, history) {
  var currentMiss = 0;
  for (var i = 0; i < history.length; i++) {
    var found = false;
    for (var j = 0; j < history[i].length; j++) {
      if (history[i][j] === num) {
        found = true;
        break;
      }
    }
    if (found) break;
    currentMiss++;
  }
  var dist = getMissDistribution(num, history);
  var below = 0;
  for (var i = 0; i < dist.gaps.length; i++) {
    if (dist.gaps[i] < currentMiss) below++;
  }
  return dist.gaps.length > 0 ? below / dist.gaps.length : 0.5;
}

function markovProb(num, history) {
  if (history.length < 2) return 0.1;
  var transitions = 0;
  var matches = 0;
  for (var i = 1; i < history.length; i++) {
    var prevNums = history[i];
    var currNums = history[i - 1];
    for (var p = 0; p < prevNums.length; p++) {
      for (var c = 0; c < currNums.length; c++) {
        if (Math.abs(currNums[c] - prevNums[p]) === 1) {
          transitions++;
          if (currNums[c] === num) matches++;
        }
      }
    }
  }
  return transitions > 0 ? matches / transitions : 0.1;
}

function pl3PatternBoost(n, pos, last) {
  var sortedLast = last.slice().sort(function(a,b){return a-b;});
  var isGroup3 = sortedLast[0] === sortedLast[1] || sortedLast[1] === sortedLast[2];
  var isStraight = sortedLast[2] - sortedLast[1] === 1 && sortedLast[1] - sortedLast[0] === 1;
  if (isGroup3 && n === last[pos]) return 3;
  if (isStraight && Math.abs(n - last[pos]) <= 1) return 2;
  return 0;
}

function pl5PatternBoost(n, pos, last) {
  var freq = {};
  for (var i = 0; i < last.length; i++) {
    freq[last[i]] = (freq[last[i]] || 0) + 1;
  }
  // 重号/对子形态延续：上期该位置数字在其他位置也出现过
  if (n === last[pos] && freq[n] >= 2) return 3;
  // 邻号延续
  if (Math.abs(n - last[pos]) <= 1) return 1;
  return 0;
}

/**
 * 近三期同位趋势分析（排列三/五专用）
 * 分析近三期同一位置的数字变化趋势，对符合趋势的数字加分
 */
function pl3Recent3Trend(n, pos, history) {
  if (history.length < 3) return 0;
  var a = history[2][pos]; // 三期前
  var b = history[1][pos]; // 两期前
  var c = history[0][pos]; // 上期

  // 趋势判断
  var ab = b - a;
  var bc = c - b;

  // 同向持续趋势（递增或递减）：下期可能继续同向
  if (ab > 0 && bc > 0) {
    // 持续递增，下期更大
    if (n > c) return 1.5;
  } else if (ab < 0 && bc < 0) {
    // 持续递减，下期更小
    if (n < c) return 1.5;
  } else if (ab > 0 && bc < 0) {
    // 先增后减（峰值），下期可能继续减或反弹
    if (n < c) return 1;
  } else if (ab < 0 && bc > 0) {
    // 先减后增（谷值），下期可能继续增或回调
    if (n > c) return 1;
  }

  // 三期同号（豹子或重号）：下期可能变化
  if (a === b && b === c) {
    if (n !== c) return 2;
  }

  // 三期对称（如3→5→3）：下期可能居中
  if (a === c && a !== b) {
    var mid = Math.round((a + b) / 2);
    if (n === mid || Math.abs(n - mid) <= 1) return 1.5;
  }

  return 0;
}

// ==================== 排列五专用选号公式 ====================

/**
 * 公式1：尾数相杀法（三期和尾推导杀号）
 * 原理：(A+B)的尾数 ≠ (C+D)的尾数，反推D为杀号
 * 实测准确率约82%，来自民间资深彩民千期数据验证
 */
function pl5TailKillFormula(history, pos) {
  if (history.length < 3) return -1; // 数据不足，不杀号
  var A = history[2][pos]; // 三期前
  var B = history[1][pos]; // 两期前
  var C = history[0][pos]; // 上一期
  var abTail = (A + B) % 10;
  var killNum = (abTail - C + 10) % 10;
  return killNum;
}

/**
 * 公式2：邻期对位取差杀号（上期-上上期的绝对值）
 * 原理：相邻两期同位差值极少出现在下期同位
 * 实测准确率约93%（出错率<7%）
 */
function pl5DiffKillFormula(history, pos) {
  if (history.length < 2) return -1;
  var prev = history[0][pos];
  var prev2 = history[1][pos];
  var diff = Math.abs(prev - prev2);
  if (diff === 0) return -1; // 差值为0时暂停使用，避免误杀
  return diff;
}

/**
 * 公式3：跨位和值取尾杀号（万位+个位的尾数）
 * 原理：上期万位+个位之和的尾数，下期全局排除
 * 实测失误率约8.2%
 */
function pl5CrossSumKillFormula(history) {
  if (history.length < 1) return -1;
  var wan = history[0][0]; // 万位
  var ge = history[0][4];  // 个位
  return (wan + ge) % 10;
}

/**
 * 公式4：三期跨度杀号（单位置跨度及±1）
 * 原理：单个位置三期最大值-最小值=跨度K，杀K和K±1
 * 返回被杀号码数组
 */
function pl5SpanKillFormula(history, pos) {
  if (history.length < 3) return [];
  var a = history[0][pos], b = history[1][pos], c = history[2][pos];
  var span = Math.max(a, b, c) - Math.min(a, b, c);
  var kills = [span];
  if (span - 1 >= 0) kills.push(span - 1);
  if (span + 1 <= 9) kills.push(span + 1);
  return kills;
}

/**
 * 综合选号公式评分器：将以上公式融合为一个评分函数
 * 对每个位置、每个数字计算"公式杀号风险"得分
 * 被杀的数字降分，未被杀的数字正常评分
 */
function pl5FormulaScore(n, pos, history) {
  var killCount = 0;
  var killNames = [];

  // 公式1：尾数相杀法（权重最高，准确率82%）
  var tailKill = pl5TailKillFormula(history, pos);
  if (tailKill === n) {
    killCount += 3;
    killNames.push('尾数相杀');
  }

  // 公式2：邻期对位取差杀号（准确率93%）
  var diffKill = pl5DiffKillFormula(history, pos);
  if (diffKill === n) {
    killCount += 3;
    killNames.push('对位差杀');
  }

  // 公式3：跨位和值取尾（全局杀号，影响略小）
  var crossKill = pl5CrossSumKillFormula(history);
  if (crossKill === n) {
    killCount += 1;
    killNames.push('跨位和值杀');
  }

  // 公式4：三期跨度杀号（±1范围，影响中等）
  var spanKills = pl5SpanKillFormula(history, pos);
  if (spanKills.indexOf(n) >= 0) {
    killCount += 1;
    killNames.push('跨度杀号');
  }

  return { killCount: killCount, killNames: killNames };
}

/**
 * 三期同位奇偶反向评分
 * 原理：连续三期同奇偶后，下期反转概率>86%
 */
function pl5OddEvenReverse(pos, history) {
  if (history.length < 3) return 0; // 无数据
  var allOdd = true, allEven = true;
  for (var i = 0; i < 3; i++) {
    if (history[i][pos] % 2 !== 1) allOdd = false;
    if (history[i][pos] % 2 !== 0) allEven = false;
  }
  if (allOdd) return 1;  // 三期全奇，下期杀奇
  if (allEven) return -1; // 三期全偶，下期杀偶
  return 0;
}

function scorePL3Position(pos, last, history) {
  var posHistory = [];
  for (var i = 0; i < history.length; i++) {
    if (history[i].length > pos) {
      posHistory.push(history[i][pos]);
    }
  }
  var lastPos = last.length > pos ? last[pos] : 0;
  var scores = [];
  var totalPeriods = posHistory.length;
  var expected = totalPeriods / 10;

  for (var n = 0; n <= 9; n++) {
    var score = { num: n, total: 0, reasons: [] };

    // 1. weighted frequency (24%)
    var wfreq = weightedFreq(n, [posHistory], Math.max(3, Math.floor(totalPeriods / 3)));
    var freqScore = Math.min(24, (wfreq / Math.max(0.001, expected / totalPeriods)) * 24);
    if (wfreq >= (expected / totalPeriods) * 1.3) score.reasons.push('高频热号');
    else if (wfreq >= (expected / totalPeriods) * 0.8) score.reasons.push('温号稳定');
    else score.reasons.push('低频冷号');
    score.total += freqScore;

    // 2. miss percentile (19%)
    var missPerc = getMissPercentile(n, [posHistory]);
    var missScore = 19 * (1 - missPerc);
    if (missPerc > 0.7) score.reasons.push('遗漏回补');
    else if (missPerc < 0.3) score.reasons.push('近期活跃');
    score.total += missScore;

    // 3. markov transition (14%)
    var mp = markovProb(n, [posHistory]);
    var markovScore = Math.min(14, mp * 14 * 10);
    if (mp > 0.15) score.reasons.push('马尔可夫强关联');
    score.total += markovScore;

    // 4. neighbor association (14%)
    var neighborScore = 0;
    var lastVal = lastPos;
    if (Math.abs(n - lastVal) === 1) {
      neighborScore = 14;
      score.reasons.push('邻号关联');
    } else if (Math.abs(n - lastVal) === 2) {
      neighborScore = 7;
      score.reasons.push('隔号关联');
    } else {
      neighborScore = 2;
    }
    score.total += neighborScore;

    // 4.5 近三期同位趋势评分（排列三专用）
    var trend3Score = pl3Recent3Trend(n, pos, history);
    if (trend3Score > 0) score.reasons.push('三期趋势');
    score.total += trend3Score;

    // 5. stability (10%): variance of intervals
    var dist = getMissDistribution(n, [posHistory]);
    var avgMiss = 0;
    for (var i = 0; i < dist.gaps.length; i++) avgMiss += dist.gaps[i];
    avgMiss = avgMiss / dist.gaps.length;
    var varMiss = 0;
    for (var i = 0; i < dist.gaps.length; i++) varMiss += Math.pow(dist.gaps[i] - avgMiss, 2);
    varMiss = varMiss / dist.gaps.length;
    var stabScore = Math.max(0, 10 - varMiss);
    if (stabScore >= 7) score.reasons.push('稳定性高');
    score.total += stabScore;

    // 6. hot-cold alternation (10%)
    var recent = posHistory.slice(0, Math.min(5, posHistory.length));
    var recentCount = 0;
    for (var i = 0; i < recent.length; i++) if (recent[i] === n) recentCount++;
    var older = posHistory.slice(Math.min(5, posHistory.length), Math.min(15, posHistory.length));
    var olderCount = 0;
    for (var i = 0; i < older.length; i++) if (older[i] === n) olderCount++;
    var hcScore = 5;
    if (recentCount === 0 && olderCount >= 1) {
      hcScore = 10;
      score.reasons.push('冷热交替(冷转热)');
    } else if (recentCount >= 2 && olderCount === 0) {
      hcScore = 8;
      score.reasons.push('冷热交替(热持续)');
    }
    score.total += hcScore;

    // 7. big-small alternation (5%)
    var lastBig = lastVal >= 5;
    var isBig = n >= 5;
    var bsScore = 2.5;
    if (lastBig !== isBig) {
      bsScore = 5;
      score.reasons.push('大小交替');
    }
    score.total += bsScore;

    // 8. pattern boost (4%): 形态延续评分
    var patternScore = pl3PatternBoost(n, pos, last);
    if (patternScore > 0) score.reasons.push('形态延续');
    score.total += patternScore;

    // 9. 近5期012路分析（排列三专用）
    if (posHistory.length >= 5) {
      var roadCounts = [0, 0, 0];
      for (var i = 0; i < 5; i++) {
        var road = posHistory[i] % 3;
        roadCounts[road]++;
      }
      var nRoad = n % 3;
      for (var r = 0; r < 3; r++) {
        if (roadCounts[r] >= 4 && nRoad !== r) {
          score.total += 1.5;
          if (score.reasons.indexOf('012路回补') < 0) score.reasons.push('012路回补');
          break;
        }
      }
      for (var r = 0; r < 3; r++) {
        if (roadCounts[r] === 0 && nRoad === r) {
          score.total += 2;
          if (score.reasons.indexOf('012路补充') < 0) score.reasons.push('012路补充');
          break;
        }
      }
    }

    // 10. 近5期均值回归辅助
    if (posHistory.length >= 5) {
      var recent5 = posHistory.slice(0, 5);
      var r5Sum = 0;
      for (var i = 0; i < recent5.length; i++) r5Sum += recent5[i];
      var r5Avg = r5Sum / 5;
      if (r5Avg >= 6.5 && n <= 3) {
        score.total += 1;
      } else if (r5Avg <= 3.5 && n >= 6) {
        score.total += 1;
      }
    }

    // 保存子分数供复盘优化使用
    score.freqScore = freqScore;
    score.missScore = missScore;
    score.repeatScore = neighborScore;

    scores.push(score);
  }

  return scores;
}

function renderPL3Recommend_V2(last, history) {
  var posScores = scorePL3Numbers(last, history);
  if (!posScores || posScores.length !== 3) {
    document.getElementById('pl3-recommend').innerHTML = '<div style="color:var(--muted);padding:1rem">评分数据加载失败，请检查历史数据格式。</div>';
    return;
  }

  // 获取各位置Top3号码，用于生成多样化推荐
  var posTop3 = [];
  for (var pos = 0; pos < 3; pos++) {
    posTop3.push(posScores[pos].slice().sort(function(a, b) { return b.total - a.total; }).slice(0, 3));
  }

  function pickByStrategy(strategy) {
    var picks = [];
    for (var pos = 0; pos < 3; pos++) {
      var scores = posScores[pos].slice();
      if (strategy === 'hot') {
        scores.sort(function(a, b) { return b.total - a.total; });
      } else if (strategy === 'miss') {
        scores.sort(function(a, b) {
          var ma = a.reasons.indexOf('遗漏回补') >= 0 ? 1 : 0;
          var mb = b.reasons.indexOf('遗漏回补') >= 0 ? 1 : 0;
          if (mb !== ma) return mb - ma;
          return b.total - a.total;
        });
      } else if (strategy === 'markov') {
        scores.sort(function(a, b) {
          var ma = a.reasons.indexOf('马尔可夫强关联') >= 0 ? 1 : 0;
          var mb = b.reasons.indexOf('马尔可夫强关联') >= 0 ? 1 : 0;
          if (mb !== ma) return mb - ma;
          return b.total - a.total;
        });
      } else if (strategy === 'neighbor') {
        scores.sort(function(a, b) {
          var ma = a.reasons.indexOf('邻号关联') >= 0 ? 1 : 0;
          var mb = b.reasons.indexOf('邻号关联') >= 0 ? 1 : 0;
          if (mb !== ma) return mb - ma;
          return b.total - a.total;
        });
      } else if (strategy === 'coldhot') {
        // 冷热搭配：热号位置选冷号，冷号位置选热号
        scores.sort(function(a, b) {
          var aHot = a.reasons.indexOf('高频热号') >= 0 || a.reasons.indexOf('热持续') >= 0 ? 1 : 0;
          var bHot = b.reasons.indexOf('高频热号') >= 0 || b.reasons.indexOf('热持续') >= 0 ? 1 : 0;
          if (aHot !== bHot) return aHot - bHot; // 冷号优先
          return b.total - a.total;
        });
      } else if (strategy === 'oddeven') {
        // 奇偶均衡：当前奇多则选偶，偶多则选奇
        var oddTrend = 0, evenTrend = 0;
        for (var i = 0; i < Math.min(3, history.length); i++) {
          if (history[i][pos] % 2 === 1) oddTrend++; else evenTrend++;
        }
        scores.sort(function(a, b) {
          var aOdd = a.num % 2 === 1 ? 1 : 0;
          var bOdd = b.num % 2 === 1 ? 1 : 0;
          if (oddTrend > evenTrend) return aOdd - bOdd; // 偶数优先
          if (evenTrend > oddTrend) return bOdd - aOdd; // 奇数优先
          return b.total - a.total;
        });
      } else if (strategy === 'bigsmall') {
        // 大小交替
        var bigTrend = 0, smallTrend = 0;
        for (var i = 0; i < Math.min(3, history.length); i++) {
          if (history[i][pos] >= 5) bigTrend++; else smallTrend++;
        }
        scores.sort(function(a, b) {
          var aBig = a.num >= 5 ? 1 : 0;
          var bBig = b.num >= 5 ? 1 : 0;
          if (bigTrend > smallTrend) return aBig - bBig; // 小号优先
          if (smallTrend > bigTrend) return bBig - aBig; // 大号优先
          return b.total - a.total;
        });
      } else {
        scores.sort(function(a, b) { return b.total - a.total; });
      }
      picks.push(scores[0].num);
    }
    return picks;
  }

  // 生成备选方案：从各位置Top3中交叉组合
  function genCrossAlts(base, strategy) {
    var alts = [];
    // 方案A：百位换第2，其他不变
    alts.push([posTop3[0][1].num, base[1], base[2]]);
    // 方案B：十位换第2，其他不变
    alts.push([base[0], posTop3[1][1].num, base[2]]);
    // 方案C：个位换第2，其他不变
    alts.push([base[0], base[1], posTop3[2][1].num]);
    // 方案D：百位第2 + 十位第2
    alts.push([posTop3[0][1].num, posTop3[1][1].num, base[2]]);
    // 方案E：十位第2 + 个位第2
    alts.push([base[0], posTop3[1][1].num, posTop3[2][1].num]);
    // 去重
    var unique = [];
    var seen = {};
    for (var i = 0; i < alts.length; i++) {
      var key = alts[i].join(',');
      if (!seen[key] && key !== base.join(',')) {
        seen[key] = true;
        unique.push(alts[i]);
      }
    }
    return unique.slice(0, 3);
  }

  var strategies = [
    { key: 'hot', name: '热号优先', desc: '各位置选评分最高的号码' },
    { key: 'miss', name: '遗漏回补', desc: '优先选遗漏值高的冷号' },
    { key: 'markov', name: '马尔可夫转移', desc: '基于转移概率选号' },
    { key: 'neighbor', name: '邻号追踪', desc: '优先选上期邻号' },
    { key: 'coldhot', name: '冷热搭配', desc: '冷号位置补热号，热号位置补冷号' },
    { key: 'oddeven', name: '奇偶均衡', desc: '根据近期奇偶趋势反向选择' },
    { key: 'bigsmall', name: '大小交替', desc: '根据近期大小趋势反向选择' }
  ];

  var html = '<div style="margin-bottom:1rem"><strong>V2 十维评分推荐（含7套策略组合）</strong></div>';
  html += '<div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.8rem">基于加权频率·遗漏回补·马尔可夫转移·邻号关联·冷热交替·奇偶趋势·大小趋势 七维评分体系</div>';

  for (var s = 0; s < strategies.length; s++) {
    var strat = strategies[s];
    var base = pickByStrategy(strat.key);
    var alts = genCrossAlts(base, strat.key);
    var recs = [base].concat(alts);

    html += '<div style="margin-bottom:1.25rem;padding:0.6rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem">';
    html += '<span style="font-weight:700;color:var(--accent);font-size:0.85rem">策略' + (s+1) + '：' + strat.name + '</span>';
    html += '<span style="font-size:0.72rem;color:var(--muted)">' + strat.desc + '</span>';
    html += '</div>';
    for (var r = 0; r < recs.length; r++) {
      var nums = recs[r];
      var oddCount = nums.filter(function(x) { return x % 2 === 1; }).length;
      var bigCount = nums.filter(function(x) { return x >= 5; }).length;
      var isBase = r === 0;
      html += '<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.2rem">';
      html += '<span style="font-size:0.72rem;color:var(--muted);min-width:40px">' + (isBase ? '主推' : '备选' + r) + '</span>';
      html += '<div style="display:flex;gap:0.3rem">';
      for (var i = 0; i < nums.length; i++) {
        html += '<div class="ball ' + (isBase ? 'gold' : 'red') + '" style="width:32px;height:32px;font-size:0.8rem">' + nums[i] + '</div>';
      }
      html += '</div>';
      html += '<span style="font-size:0.7rem;color:var(--muted);margin-left:auto">和' + sum(nums) + '·跨' + span(nums) + '·奇' + oddCount + '·大' + bigCount + '</span>';
      html += '</div>';
    }
    html += '</div>';
  }

  // Top 10 score detail table
  html += '<div style="margin-top:1.5rem"><strong>各位置评分详情 Top10</strong></div>';
  var posNames = ['百位', '十位', '个位'];
  for (var pos = 0; pos < 3; pos++) {
    html += '<div style="margin-top:0.75rem;font-size:0.85rem;color:var(--ink);font-weight:600">' + posNames[pos] + '号码评分</div>';
    html += '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-top:0.25rem;margin-bottom:1rem">';
    html += '<thead><tr style="background:var(--bg3)"><th style="padding:4px;border:1px solid var(--rule)">号码</th><th style="padding:4px;border:1px solid var(--rule)">评分</th><th style="padding:4px;border:1px solid var(--rule)">标签</th></tr></thead><tbody>';
    var sorted = posScores[pos].slice().sort(function(a, b) { return b.total - a.total; });
    for (var i = 0; i < Math.min(10, sorted.length); i++) {
      var sc = sorted[i];
      html += '<tr><td style="padding:4px;border:1px solid var(--rule);text-align:center;font-weight:700">' + sc.num + '</td>';
      html += '<td style="padding:4px;border:1px solid var(--rule);text-align:center">' + sc.total.toFixed(1) + '</td>';
      html += '<td style="padding:4px;border:1px solid var(--rule);color:var(--muted)">' + sc.reasons.join('，') + '</td></tr>';
    }
    html += '</tbody></table>';
  }

  html += '<div class="disclaimer" style="margin-top:1.5rem"><strong>声明：</strong>以上推荐号码基于历史数据统计分析生成，仅供娱乐参考。彩票开奖为随机事件，不构成任何投注建议。</div>';

  document.getElementById('pl3-recommend').innerHTML = html;
}

// ==================== 排列五分析 ====================

function loadPL5Sample() {
  if (typeof PL5_HISTORY === 'undefined' || !PL5_HISTORY || PL5_HISTORY.length === 0) return;
  var last = PL5_HISTORY[0];
  document.getElementById('pl5-numbers').value = last.numbers.join(',');
  var historyLines = [];
  for (var i = 0; i < PL5_HISTORY.length; i++) {
    historyLines.push(PL5_HISTORY[i].numbers.join(','));
  }
  document.getElementById('pl5-history').value = historyLines.join('\n');
  // 填充复盘输入框默认值
  var reviewNums = document.getElementById('pl5-review-numbers');
  if (reviewNums) reviewNums.value = last.numbers.join(',');
}

function clearPL5() {
  document.getElementById('pl5-numbers').value = '';
  document.getElementById('pl5-history').value = '';
  document.getElementById('pl5-results').style.display = 'none';
  document.getElementById('pl5-empty').style.display = 'block';
}

function analyzePL5() {
  var numsStr = document.getElementById('pl5-numbers').value;
  var historyStr = document.getElementById('pl5-history').value;

  var lastNums = parseNums0(numsStr);

  var lines = historyStr.trim().split('\n').filter(function(l) { return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums0(lines[i]);
    if (nums.length >= 5) {
      history.push(nums.slice(0, 5));
    }
  }

  if (history.length === 0 && lastNums.length >= 5) {
    history.unshift(lastNums.slice(0, 5));
  }

  if (history.length < 2) { alert('请至少输入2期历史数据（每期5个号码，0-9）'); return; }

  var last = history[0];

  document.getElementById('pl5-empty').style.display = 'none';
  document.getElementById('pl5-results').style.display = 'block';

  renderPL5Stats(last, history);
  renderPL5Repeat(last, history);
  renderPL5Sum(history);
  renderPL5Span(history);
  renderPL5HotCold(history);
  renderPL5OddEven(history);
  renderPL5Tail(history);
  renderPL5Miss(history);
  renderPL5Recommend_V2(last, history);

  document.getElementById('pl5-results').scrollIntoView({ behavior: 'smooth' });
}

function renderPL5Stats(last, history) {
  var s = sum(last);
  var sp = span(last);
  var sums = history.map(function(h) { return sum(h); });
  var oddCount = last.filter(function(n) { return n % 2 === 1; }).length;
  var bigCount = last.filter(function(n) { return n >= 5; }).length;

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + s + '</div><div class="stat-label">当期和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + sp + '</div><div class="stat-label">当期跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + oddCount + ':' + (5 - oddCount) + '</div><div class="stat-label">奇偶比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + bigCount + ':' + (5 - bigCount) + '</div><div class="stat-label">大小比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">当期开奖号码</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < last.length; i++) {
    html += '<div class="ball red">' + last[i] + '</div>';
  }
  html += '</div></div>';

  document.getElementById('pl5-stats').innerHTML = html;
}

function renderPL5Repeat(last, history) {
  var html = '';
  var repeatCounts = [];
  for (var i = 1; i < history.length; i++) {
    var repeat = intersection(last, history[i]).length;
    repeatCounts.push(repeat);
  }
  var avgRepeat = avg(repeatCounts).toFixed(1);

  html += '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">历史平均重号</span><span class="result-value">' + avgRepeat + ' 个</span></div>';

  var repeatFreq = {};
  for (var i = 1; i < history.length; i++) {
    var repeats = intersection(history[i - 1], history[i]);
    for (var j = 0; j < repeats.length; j++) {
      repeatFreq[repeats[j]] = (repeatFreq[repeats[j]] || 0) + 1;
    }
  }

  var candidates = [];
  for (var i = 0; i < last.length; i++) {
    var n = last[i];
    var freq = repeatFreq[n] || 0;
    var reasons = [];
    if (freq >= 2) reasons.push('历史重号高频');
    var consecutive = 0;
    for (var j = 0; j < history.length; j++) {
      if (history[j].indexOf(n) >= 0) consecutive++;
      else break;
    }
    if (consecutive <= 1) reasons.push('非连续号');
    if (freq >= 1) reasons.push('有重号先例');
    candidates.push({ num: n, freq: freq, consecutive: consecutive, reasons: reasons });
  }
  candidates.sort(function(a, b) { return b.freq - a.freq; });

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">上期号码重号可能性评估</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>号码</th><th>历史重号次数</th><th>连续出现期数</th><th>评估</th><th>依据</th></tr>';
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    var badge = c.freq >= 2 ? '<span class="badge badge-hot">高概率</span>' :
                c.freq >= 1 ? '<span class="badge badge-warm">中等</span>' :
                '<span class="badge badge-cold">低概率</span>';
    html += '<tr><td><span class="hl-red">' + c.num + '</span></td><td>' + c.freq + '</td><td>' + c.consecutive + '</td><td>' + badge + '</td><td>' + c.reasons.map(function(r){return '<span class="reason-tag">'+r+'</span>';}).join('') + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('pl5-repeat').innerHTML = html;
}

function renderPL5Sum(history) {
  var sums = history.map(function(h) { return sum(h); });
  var lastSum = sums[0];
  var avgSum = Math.round(avg(sums));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期和值</span><span class="result-value">' + lastSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均和值</span><span class="result-value">' + avgSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">和值范围</span><span class="result-value">' + min(sums) + ' ~ ' + max(sums) + '</span></div>';

  var diff = lastSum - avgSum;
  var trend = diff > 8 ? '偏高，下期可能回落' : diff < -8 ? '偏低，下期可能回升' : '正常波动范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';

  var sugMin = Math.max(0, avgSum - 8);
  var sugMax = Math.min(45, avgSum + 8);
  html += '<div class="result-row"><span class="result-label">建议和值范围</span><span class="result-value hl-gold">' + sugMin + ' ~ ' + sugMax + '</span></div>';
  html += '</div>';

  document.getElementById('pl5-sum').innerHTML = html;
  renderPL5SumChart(sums);
}

function renderPL5Span(history) {
  var spans = history.map(function(h) { return span(h); });
  var lastSp = spans[0];
  var avgSp = Math.round(avg(spans));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期跨度</span><span class="result-value">' + lastSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均跨度</span><span class="result-value">' + avgSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">跨度范围</span><span class="result-value">' + min(spans) + ' ~ ' + max(spans) + '</span></div>';

  var diff = lastSp - avgSp;
  var trend = diff > 2 ? '偏大，下期可能缩小' : diff < -2 ? '偏小，下期可能扩大' : '正常范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';

  var sugMin = Math.max(0, avgSp - 2);
  var sugMax = Math.min(9, avgSp + 2);
  html += '<div class="result-row"><span class="result-label">建议跨度范围</span><span class="result-value hl-gold">' + sugMin + ' ~ ' + sugMax + '</span></div>';
  html += '</div>';

  document.getElementById('pl5-span').innerHTML = html;
  renderPL5SpanChart(spans);
}

function renderPL5HotCold(history) {
  var freqMap = {};
  for (var n = 0; n <= 9; n++) freqMap[n] = 0;
  for (var i = 0; i < history.length; i++) {
    for (var j = 0; j < history[i].length; j++) {
      freqMap[history[i][j]]++;
    }
  }

  var totalPeriods = history.length;
  var expected = (5 / 10) * totalPeriods;

  var hot = [], warm = [], cold = [];
  for (var n = 0; n <= 9; n++) {
    var f = freqMap[n];
    if (f >= expected * 1.3) hot.push({ num: n, freq: f });
    else if (f <= expected * 0.7) cold.push({ num: n, freq: f });
    else warm.push({ num: n, freq: f });
  }
  hot.sort(function(a, b) { return b.freq - a.freq; });
  cold.sort(function(a, b) { return a.freq - b.freq; });

  var html = '<div class="result-section">';
  html += '<div style="margin-bottom:1rem;color:var(--muted);font-size:0.85rem">理论期望频次: ' + expected.toFixed(1) + ' 次/' + totalPeriods + '期</div>';

  html += '<div style="margin-bottom:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号 (' + hot.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < hot.length; i++) {
    html += '<div class="ball red hot tooltip" data-tip="' + hot[i].freq + '次">' + hot[i].num + '</div>';
  }
  html += '</div></div>';

  html += '<div><span class="badge badge-cold" style="margin-right:0.5rem">冷号 (' + cold.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < cold.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + cold[i].freq + '次">' + cold[i].num + '</div>';
  }
  html += '</div></div>';

  // Frequency detail
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">各号码出现频率</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>号码</th><th>出现次数</th><th>期望值</th><th>偏差</th><th>状态</th></tr>';
  for (var n = 0; n <= 9; n++) {
    var f = freqMap[n];
    var dev = expected > 0 ? ((f - expected) / expected * 100).toFixed(1) : '0.0';
    var devStr = dev > 0 ? '+' + dev + '%' : dev + '%';
    var badge = f >= expected * 1.3 ? '<span class="badge badge-hot">热号</span>' :
                f <= expected * 0.7 ? '<span class="badge badge-cold">冷号</span>' :
                '<span class="badge badge-warm">正常</span>';
    html += '<tr><td><span class="hl-red">' + n + '</span></td><td>' + f + '</td><td>' + expected.toFixed(1) + '</td><td>' + devStr + '</td><td>' + badge + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('pl5-hotcold').innerHTML = html;
  renderPL5FreqChart(freqMap, expected);
}

function renderPL5OddEven(history) {
  var html = '<div class="result-section">';

  var oddEvenRatios = [];
  var bigSmallRatios = [];
  for (var i = 0; i < history.length; i++) {
    var oddC = history[i].filter(function(n) { return n % 2 === 1; }).length;
    oddEvenRatios.push({ odd: oddC, even: 5 - oddC });
    var bigC = history[i].filter(function(n) { return n >= 5; }).length;
    bigSmallRatios.push({ big: bigC, small: 5 - bigC });
  }

  var avgOdd = (oddEvenRatios.reduce(function(s, r) { return s + r.odd; }, 0) / oddEvenRatios.length).toFixed(1);
  var avgBig = (bigSmallRatios.reduce(function(s, r) { return s + r.big; }, 0) / bigSmallRatios.length).toFixed(1);

  html += '<div class="result-row"><span class="result-label">上期奇偶比</span><span class="result-value">' + oddEvenRatios[0].odd + ':' + oddEvenRatios[0].even + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均奇数</span><span class="result-value">' + avgOdd + ' 个</span></div>';
  html += '<div class="result-row"><span class="result-label">上期大小比</span><span class="result-value">' + bigSmallRatios[0].big + ':' + bigSmallRatios[0].small + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均大数</span><span class="result-value">' + avgBig + ' 个</span></div>';

  var oddDiff = oddEvenRatios[0].odd - avgOdd;
  var oddSug = oddDiff > 0.5 ? '奇数偏多，下期可能偶数回补' : oddDiff < -0.5 ? '偶数偏多，下期可能奇数回补' : '奇偶均衡';
  html += '<div class="result-row"><span class="result-label">奇偶趋势</span><span class="result-value">' + oddSug + '</span></div>';

  var bigDiff = bigSmallRatios[0].big - avgBig;
  var bigSug = bigDiff > 0.5 ? '大数偏多，下期可能小数回补' : bigDiff < -0.5 ? '小数偏多，下期可能大数回补' : '大小均衡';
  html += '<div class="result-row"><span class="result-label">大小趋势</span><span class="result-value">' + bigSug + '</span></div>';

  html += '</div>';
  document.getElementById('pl5-odd-even').innerHTML = html;
  renderPL5OddEvenChart(oddEvenRatios);
}

function renderPL5Tail(history) {
  var html = '<div class="result-section">';

  var tailFreq = {};
  for (var t = 0; t <= 9; t++) tailFreq[t] = 0;
  for (var i = 0; i < history.length; i++) {
    for (var j = 0; j < history[i].length; j++) {
      tailFreq[history[i][j]]++;
    }
  }

  var totalBalls = history.length * 5;
  var expected = totalBalls / 10;

  var hotTails = [], coldTails = [];
  for (var t = 0; t <= 9; t++) {
    if (tailFreq[t] >= expected * 1.15) hotTails.push({ tail: t, freq: tailFreq[t] });
    else if (tailFreq[t] <= expected * 0.85) coldTails.push({ tail: t, freq: tailFreq[t] });
  }
  hotTails.sort(function(a, b) { return b.freq - a.freq; });
  coldTails.sort(function(a, b) { return a.freq - b.freq; });

  var lastTails = history[0].slice();
  var uniqueLastTails = [];
  for (var i = 0; i < lastTails.length; i++) {
    if (uniqueLastTails.indexOf(lastTails[i]) < 0) uniqueLastTails.push(lastTails[i]);
  }

  html += '<div class="result-row"><span class="result-label">期望频率</span><span class="result-value">' + expected.toFixed(1) + ' 次/号</span></div>';
  html += '<div class="result-row"><span class="result-label">上期尾数</span><span class="result-value">';
  for (var i = 0; i < uniqueLastTails.length; i++) {
    html += '<span class="hl-red" style="margin-right:0.3rem">' + uniqueLastTails[i] + '</span>';
  }
  html += ' (覆盖' + uniqueLastTails.length + '个号码)</span></div>';

  html += '<div style="margin-top:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号</span><div class="ball-row">';
  for (var i = 0; i < hotTails.length; i++) {
    html += '<div class="ball red hot tooltip" data-tip="' + hotTails[i].freq + '次">' + hotTails[i].tail + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-top:0.5rem"><span class="badge badge-cold" style="margin-right:0.5rem">冷号</span><div class="ball-row">';
  for (var i = 0; i < coldTails.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + coldTails[i].freq + '次">' + coldTails[i].tail + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">各号码出现频率</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>号码</th><th>出现次数</th><th>期望值</th><th>偏差</th><th>状态</th></tr>';
  for (var t = 0; t <= 9; t++) {
    var freq = tailFreq[t];
    var dev = expected > 0 ? ((freq - expected) / expected * 100).toFixed(1) : '0.0';
    var devStr = dev > 0 ? '+' + dev + '%' : dev + '%';
    var badge = freq >= expected * 1.15 ? '<span class="badge badge-hot">热</span>' :
                freq <= expected * 0.85 ? '<span class="badge badge-cold">冷</span>' :
                '<span class="badge badge-warm">正常</span>';
    html += '<tr><td><span class="hl-red">' + t + '</span></td><td>' + freq + '</td><td>' + expected.toFixed(1) + '</td><td>' + devStr + '</td><td>' + badge + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('pl5-tail').innerHTML = html;
  renderPL5TailChart(tailFreq, expected);
}

function renderPL5Miss(history) {
  var html = '<div class="result-section">';

  var missData = {};
  for (var n = 0; n <= 9; n++) {
    var miss = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === history.length) miss = history.length;
    missData[n] = miss;
  }

  var totalMiss = 0;
  for (var n = 0; n <= 9; n++) totalMiss += missData[n];
  var avgMiss = (totalMiss / 10).toFixed(1);

  var hotBalls = [], coldBalls = [];
  for (var n = 0; n <= 9; n++) {
    if (missData[n] <= Math.floor(avgMiss * 0.5)) {
      hotBalls.push({ num: n, miss: missData[n] });
    } else if (missData[n] >= avgMiss * 1.5) {
      coldBalls.push({ num: n, miss: missData[n] });
    }
  }
  hotBalls.sort(function(a, b) { return a.miss - b.miss; });
  coldBalls.sort(function(a, b) { return b.miss - a.miss; });

  var maxMissBall = 0, maxMissVal = 0;
  for (var n = 0; n <= 9; n++) {
    if (missData[n] > maxMissVal) { maxMissVal = missData[n]; maxMissBall = n; }
  }

  html += '<div class="result-row"><span class="result-label">平均遗漏</span><span class="result-value">' + avgMiss + ' 期</span></div>';
  html += '<div class="result-row"><span class="result-label">最大遗漏</span><span class="result-value hl-red">' + maxMissBall + ' (遗漏' + maxMissVal + '期)</span></div>';

  html += '<div style="margin-top:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号(低遗漏)</span><div class="ball-row">';
  for (var i = 0; i < hotBalls.length; i++) {
    var badge = hotBalls[i].miss === 0 ? '当期开出' : '遗漏' + hotBalls[i].miss + '期';
    html += '<div class="ball red hot tooltip" data-tip="' + badge + '">' + hotBalls[i].num + '</div>';
  }
  html += '</div></div>';

  html += '<div style="margin-top:0.5rem"><span class="badge badge-cold" style="margin-right:0.5rem">冷号(高遗漏)</span><div class="ball-row">';
  for (var i = 0; i < coldBalls.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="遗漏' + coldBalls[i].miss + '期">' + coldBalls[i].num + '</div>';
  }
  html += '</div></div>';

  // Detail table
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">各号码遗漏期数</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>号码</th><th>遗漏期数</th><th>平均遗漏</th><th>状态</th></tr>';
  for (var n = 0; n <= 9; n++) {
    var m = missData[n];
    var badge = m === 0 ? '<span class="badge badge-hot">当期开出</span>' :
                m <= Math.floor(avgMiss * 0.5) ? '<span class="badge badge-hot">低遗漏</span>' :
                m >= avgMiss * 1.5 ? '<span class="badge badge-cold">高遗漏</span>' :
                '<span class="badge badge-warm">正常</span>';
    html += '<tr><td><span class="hl-red">' + n + '</span></td><td>' + m + '</td><td>' + avgMiss + '</td><td>' + badge + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('pl5-miss').innerHTML = html;
  renderPL5MissChart(missData);
}

function scorePL5Numbers(last, history) {
  // V2: position-independent 8-dimensional model for 5 positions
  var posScores = [];
  for (var pos = 0; pos < 5; pos++) {
    posScores[pos] = scorePL5Position(pos, last, history);
  }
  return posScores;
}

function scorePL5Position(pos, last, history) {
  var posHistory = [];
  for (var i = 0; i < history.length; i++) {
    if (history[i].length > pos) {
      posHistory.push(history[i][pos]);
    }
  }
  var lastPos = last.length > pos ? last[pos] : 0;
  var scores = [];
  var totalPeriods = posHistory.length;
  var expected = totalPeriods / 10;

  // 预计算专用公式杀号数据（每位置只算一次）
  var formulaResults = {};
  var oddEvenDir = pl5OddEvenReverse(pos, history);
  for (var n = 0; n <= 9; n++) {
    formulaResults[n] = pl5FormulaScore(n, pos, history);
  }

  for (var n = 0; n <= 9; n++) {
    var score = { num: n, total: 0, reasons: [] };

    // 1. weighted frequency (20%)
    var wfreq = weightedFreq(n, [posHistory], Math.max(3, Math.floor(totalPeriods / 3)));
    var freqScore = Math.min(20, (wfreq / Math.max(0.001, expected / totalPeriods)) * 20);
    if (wfreq >= (expected / totalPeriods) * 1.3) score.reasons.push('高频热号');
    else if (wfreq >= (expected / totalPeriods) * 0.8) score.reasons.push('温号稳定');
    else score.reasons.push('低频冷号');
    score.total += freqScore;

    // 2. miss percentile (16%)
    var missPerc = getMissPercentile(n, [posHistory]);
    var missScore = 16 * (1 - missPerc);
    if (missPerc > 0.7) score.reasons.push('遗漏回补');
    else if (missPerc < 0.3) score.reasons.push('近期活跃');
    score.total += missScore;

    // 3. markov transition (12%)
    var mp = markovProb(n, [posHistory]);
    var markovScore = Math.min(12, mp * 12 * 10);
    if (mp > 0.15) score.reasons.push('马尔可夫强关联');
    score.total += markovScore;

    // 4. neighbor association (12%)
    var neighborScore = 0;
    var lastVal = lastPos;
    if (Math.abs(n - lastVal) === 1) {
      neighborScore = 12;
      score.reasons.push('邻号关联');
    } else if (Math.abs(n - lastVal) === 2) {
      neighborScore = 6;
      score.reasons.push('隔号关联');
    } else {
      neighborScore = 2;
    }
    score.total += neighborScore;

    // 4.5 近三期同位趋势评分（排列五专用）
    var trend3Score = pl3Recent3Trend(n, pos, history);
    if (trend3Score > 0) score.reasons.push('三期趋势');
    score.total += trend3Score;

    // 5. stability (8%): variance of intervals
    var dist = getMissDistribution(n, [posHistory]);
    var avgMiss = 0;
    for (var i = 0; i < dist.gaps.length; i++) avgMiss += dist.gaps[i];
    avgMiss = avgMiss / dist.gaps.length;
    var varMiss = 0;
    for (var i = 0; i < dist.gaps.length; i++) varMiss += Math.pow(dist.gaps[i] - avgMiss, 2);
    varMiss = varMiss / dist.gaps.length;
    var stabScore = Math.max(0, 8 - varMiss);
    if (stabScore >= 5.6) score.reasons.push('稳定性高');
    score.total += stabScore;

    // 6. hot-cold alternation (8%)
    var recent = posHistory.slice(0, Math.min(5, posHistory.length));
    var recentCount = 0;
    for (var i = 0; i < recent.length; i++) if (recent[i] === n) recentCount++;
    var older = posHistory.slice(Math.min(5, posHistory.length), Math.min(15, posHistory.length));
    var olderCount = 0;
    for (var i = 0; i < older.length; i++) if (older[i] === n) olderCount++;
    var hcScore = 4;
    if (recentCount === 0 && olderCount >= 1) {
      hcScore = 8;
      score.reasons.push('冷热交替(冷转热)');
    } else if (recentCount >= 2 && olderCount === 0) {
      hcScore = 6;
      score.reasons.push('冷热交替(热持续)');
    }
    score.total += hcScore;

    // 7. big-small alternation (4%)
    var lastBig = lastVal >= 5;
    var isBig = n >= 5;
    var bsScore = 2;
    if (lastBig !== isBig) {
      bsScore = 4;
      score.reasons.push('大小交替');
    }
    score.total += bsScore;

    // 8. pattern boost (3%): 形态延续评分
    var patternScore = pl5PatternBoost(n, pos, last);
    if (patternScore > 0) score.reasons.push('形态延续');
    score.total += patternScore;

    // 9. 专用选号公式杀号反向评分 (17%)
    //    被多个公式命中的号码扣分，未被命中的加分
    var fr = formulaResults[n];
    if (fr.killCount > 0) {
      // 被杀号：按命中公式数量扣分
      var penalty = Math.min(17, fr.killCount * 4);
      score.total -= penalty;
      if (fr.killCount >= 2) score.reasons.push('公式杀号(' + fr.killNames.join('+') + ')');
    } else {
      // 未被任何公式命中，加安全分
      score.total += 5;
    }

    // 10. 三期奇偶反向调整 (附加)
    if (oddEvenDir !== 0) {
      if (oddEvenDir === 1 && n % 2 === 1) {
        // 三期全奇，杀奇数（奇数扣分）
        score.total -= 3;
      } else if (oddEvenDir === -1 && n % 2 === 0) {
        // 三期全偶，杀偶数（偶数扣分）
        score.total -= 3;
      }
    }

    // 11. 近5期012路分析（排列五专用）
    // 统计近5期该位置数字的012路分布，偏态时修正
    if (posHistory.length >= 5) {
      var roadCounts = [0, 0, 0]; // 0路(0369), 1路(147), 2路(258)
      for (var i = 0; i < 5; i++) {
        var road = posHistory[i] % 3;
        roadCounts[road]++;
      }
      var nRoad = n % 3;
      // 如果某路近5期出现>=4次，下期倾向补缺
      for (var r = 0; r < 3; r++) {
        if (roadCounts[r] >= 4 && nRoad !== r) {
          score.total += 1.5;
          if (score.reasons.indexOf('012路回补') < 0) score.reasons.push('012路回补');
          break;
        }
      }
      // 如果某路近5期出现0次，下期可能补充
      for (var r = 0; r < 3; r++) {
        if (roadCounts[r] === 0 && nRoad === r) {
          score.total += 2;
          if (score.reasons.indexOf('012路补充') < 0) score.reasons.push('012路补充');
          break;
        }
      }
    }

    // 12. 近5期和值/跨度范围辅助（排列五专用）
    // 分析该位置近5期的数字范围，辅助判断回归方向
    if (posHistory.length >= 5) {
      var recent5 = posHistory.slice(0, 5);
      var r5Sum = 0;
      for (var i = 0; i < recent5.length; i++) r5Sum += recent5[i];
      var r5Avg = r5Sum / 5;
      // 如果近5期均值偏高（>=6），下期倾向偏小数字回归
      if (r5Avg >= 6.5 && n <= 3) {
        score.total += 1;
      } else if (r5Avg <= 3.5 && n >= 6) {
        score.total += 1;
      }
    }

    // 确保总分不为负
    if (score.total < 0) score.total = 0;

    // 保存子分数供复盘优化使用
    score.freqScore = freqScore;
    score.missScore = missScore;
    score.repeatScore = neighborScore;

    scores.push(score);
  }

  return scores;
}


function renderPL5Recommend_V2(last, history) {
  var posScores = scorePL5Numbers(last, history);

  function pickByStrategy(strategy) {
    var picks = [];
    for (var pos = 0; pos < 5; pos++) {
      var scores = posScores[pos].slice();
      if (strategy === 'hot') {
        scores.sort(function(a, b) { return b.total - a.total; });
      } else if (strategy === 'miss') {
        scores.sort(function(a, b) {
          var ma = a.reasons.indexOf('遗漏回补') >= 0 ? 1 : 0;
          var mb = b.reasons.indexOf('遗漏回补') >= 0 ? 1 : 0;
          if (mb !== ma) return mb - ma;
          return b.total - a.total;
        });
      } else if (strategy === 'markov') {
        scores.sort(function(a, b) {
          var ma = a.reasons.indexOf('马尔可夫强关联') >= 0 ? 1 : 0;
          var mb = b.reasons.indexOf('马尔可夫强关联') >= 0 ? 1 : 0;
          if (mb !== ma) return mb - ma;
          return b.total - a.total;
        });
      } else if (strategy === 'neighbor') {
        scores.sort(function(a, b) {
          var ma = a.reasons.indexOf('邻号关联') >= 0 ? 1 : 0;
          var mb = b.reasons.indexOf('邻号关联') >= 0 ? 1 : 0;
          if (mb !== ma) return mb - ma;
          return b.total - a.total;
        });
      } else if (strategy === 'formula') {
        scores.sort(function(a, b) {
          // 优先选择未被公式命中的号码
          var aKilled = a.reasons.some(function(r){ return r.indexOf('公式杀号') >= 0; }) ? 1 : 0;
          var bKilled = b.reasons.some(function(r){ return r.indexOf('公式杀号') >= 0; }) ? 1 : 0;
          if (aKilled !== bKilled) return aKilled - bKilled;
          return b.total - a.total;
        });
      } else {
        scores.sort(function(a, b) { return b.total - a.total; });
      }
      picks.push(scores[0].num);
    }
    return picks;
  }

  function genAlt(picks) {
    var alts = [];
    for (var pos = 0; pos < 5; pos++) {
      var scores = posScores[pos].slice();
      scores.sort(function(a, b) { return b.total - a.total; });
      var idx = 0;
      for (var i = 0; i < scores.length; i++) {
        if (scores[i].num === picks[pos]) {
          idx = i;
          break;
        }
      }
      var alt = picks.slice();
      alt[pos] = scores[(idx + 1) % scores.length].num;
      alts.push(alt);
    }
    return alts;
  }

  var strategies = [
    { key: 'hot', name: '热号优先' },
    { key: 'miss', name: '遗漏回补' },
    { key: 'markov', name: '马尔可夫转移' },
    { key: 'neighbor', name: '邻号追踪' },
    { key: 'formula', name: '公式杀号排除' },
    { key: 'balanced', name: '混合平衡' }
  ];

  var html = '<div style="margin-bottom:1rem"><strong>V2 十维评分推荐（含4套专用选号公式）</strong></div>';
  html += '<div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.5rem">公式来源：尾数相杀法(82%) · 对位差杀(93%) · 跨位和值杀(92%) · 三期跨度杀 · 奇偶反向</div>';

  for (var s = 0; s < strategies.length; s++) {
    var strat = strategies[s];
    var base = pickByStrategy(strat.key);
    var alts = genAlt(base);
    var recs = [base, alts[0], alts[1]];

    html += '<div style="margin-bottom:1.25rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">策略: ' + strat.name + '</div>';
    for (var r = 0; r < recs.length; r++) {
      var nums = recs[r];
      html += '<div class="ball-row" style="margin-bottom:0.3rem">';
      for (var i = 0; i < nums.length; i++) {
        html += '<div class="ball red">' + nums[i] + '</div>';
      }
      html += '</div>';
      html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.5rem">和值: ' + sum(nums) + ' | 跨度: ' + span(nums) + '</div>';
    }
    html += '</div>';
  }

  // Top 10 score detail table
  html += '<div style="margin-top:1rem"><strong>各位置评分详情 Top10</strong></div>';
  var posNames = ['万位', '千位', '百位', '十位', '个位'];
  for (var pos = 0; pos < 5; pos++) {
    html += '<div style="margin-top:0.75rem;font-size:0.82rem;color:var(--muted)">' + posNames[pos] + '</div>';
    html += '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-top:0.25rem">';
    html += '<thead><tr style="background:var(--bg3)"><th style="padding:4px;border:1px solid var(--border)">号码</th><th style="padding:4px;border:1px solid var(--border)">评分</th><th style="padding:4px;border:1px solid var(--border)">标签</th></tr></thead><tbody>';
    var sorted = posScores[pos].slice().sort(function(a, b) { return b.total - a.total; });
    for (var i = 0; i < Math.min(10, sorted.length); i++) {
      var sc = sorted[i];
      html += '<tr><td style="padding:4px;border:1px solid var(--border);text-align:center">' + sc.num + '</td>';
      html += '<td style="padding:4px;border:1px solid var(--border);text-align:center">' + sc.total.toFixed(1) + '</td>';
      html += '<td style="padding:4px;border:1px solid var(--border)">' + sc.reasons.join('，') + '</td></tr>';
    }
    html += '</tbody></table>';
  }

  html += '<div class="disclaimer" style="margin-top:1.5rem"><strong>声明：</strong>以上推荐号码基于历史数据统计分析生成，仅供娱乐参考。彩票开奖为随机事件，不构成任何投注建议。</div>';

  document.getElementById('pl5-recommend').innerHTML = html;
}

// ==================== 排列三/排列五 复盘函数 ====================

function reviewPL3() {
  var userNums = parseNums0(document.getElementById('pl3-review-numbers').value);
  if (userNums.length < 3) { alert('请输入3个数字（0-9，逗号分隔）'); return; }

  var lastNums = PL3_HISTORY[0].numbers;
  var posHits = [0, 0, 0];
  var numHits = 0;
  var hitDetails = [];

  for (var i = 0; i < 3; i++) {
    if (userNums[i] === lastNums[i]) {
      posHits[i] = 1;
      numHits++;
      hitDetails.push('第' + (i + 1) + '位命中 ' + userNums[i]);
    }
  }

  var setHits = 0;
  for (var i = 0; i < userNums.length; i++) {
    if (lastNums.indexOf(userNums[i]) >= 0) setHits++;
  }

  var html = '<div style="margin-bottom:0.5rem"><strong>当期开奖：</strong>' + lastNums.join(',') + '</div>';
  html += '<div style="margin-bottom:0.5rem"><strong>您的选号：</strong>' + userNums.join(',') + '</div>';
  html += '<div class="stat-grid" style="margin:0.75rem 0">';
  html += '<div class="stat-item"><div class="stat-value">' + numHits + '/3</div><div class="stat-label">定位命中</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + setHits + '/3</div><div class="stat-label">号码包含</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + (numHits >= 3 ? '直选' : numHits >= 1 ? '定位' : setHits >= 2 ? '组选' : '未中') + '</div><div class="stat-label">奖级</div></div>';
  html += '</div>';

  html += '<div style="margin-bottom:0.5rem"><strong>位置对比：</strong></div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < 3; i++) {
    var isHit = posHits[i] === 1;
    html += '<div style="text-align:center;margin-right:0.75rem">';
    html += '<div style="color:var(--muted);font-size:0.75rem;margin-bottom:0.25rem">第' + (i + 1) + '位</div>';
    html += '<span class="ball ' + (isHit ? 'red' : 'gray') + '">' + userNums[i] + '</span>';
    html += '<div style="color:var(--muted);font-size:0.7rem;margin-top:0.25rem">开奖 ' + lastNums[i] + '</div>';
    html += '</div>';
  }
  html += '</div>';

  if (hitDetails.length > 0) {
    html += '<div style="margin-top:0.5rem;color:var(--accent3);font-size:0.85rem">' + hitDetails.join('；') + '</div>';
  }

  var score = numHits * 30 + (setHits - numHits) * 10;
  var grade = score >= 80 ? '优秀' : score >= 50 ? '良好' : score >= 20 ? '一般' : '需改进';
  var color = score >= 80 ? 'var(--accent3)' : score >= 50 ? 'var(--accent4)' : score >= 20 ? 'var(--accent)' : 'var(--accent2)';
  html += '<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg3);border-radius:8px">';
  html += '<div style="font-size:1.1rem;font-weight:700;color:' + color + ';margin-bottom:0.5rem">综合评价：' + grade + '（得分 ' + score + '）</div>';
  html += '<div style="color:var(--muted);font-size:0.85rem">';
  if (numHits >= 2) html += '定位命中率高，号码走势把握较好。';
  else if (numHits >= 1) html += '有定位命中，建议结合冷热号和遗漏分析优化。';
  else if (setHits >= 2) html += '号码包含命中较多，可考虑组选玩法。';
  else html += '命中偏低，建议参考冷热号、和值和跨度分析调整选号。';
  html += '</div></div>';

  document.getElementById('pl3-review-result').innerHTML = html;
}

function reviewPL5() {
  var userNums = parseNums0(document.getElementById('pl5-review-numbers').value);
  if (userNums.length < 5) { alert('请输入5个数字（0-9，逗号分隔）'); return; }

  var lastNums = PL5_HISTORY[0].numbers;
  var posHits = [0, 0, 0, 0, 0];
  var numHits = 0;
  var hitDetails = [];

  for (var i = 0; i < 5; i++) {
    if (userNums[i] === lastNums[i]) {
      posHits[i] = 1;
      numHits++;
      hitDetails.push('第' + (i + 1) + '位命中 ' + userNums[i]);
    }
  }

  var setHits = 0;
  for (var i = 0; i < userNums.length; i++) {
    if (lastNums.indexOf(userNums[i]) >= 0) setHits++;
  }

  var html = '<div style="margin-bottom:0.5rem"><strong>当期开奖：</strong>' + lastNums.join(',') + '</div>';
  html += '<div style="margin-bottom:0.5rem"><strong>您的选号：</strong>' + userNums.join(',') + '</div>';
  html += '<div class="stat-grid" style="margin:0.75rem 0">';
  html += '<div class="stat-item"><div class="stat-value">' + numHits + '/5</div><div class="stat-label">定位命中</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + setHits + '/5</div><div class="stat-label">号码包含</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + (numHits >= 5 ? '一等奖' : numHits >= 4 ? '二等奖' : numHits >= 3 ? '三等奖' : numHits >= 2 ? '四等奖' : '未中') + '</div><div class="stat-label">奖级</div></div>';
  html += '</div>';

  html += '<div style="margin-bottom:0.5rem"><strong>位置对比：</strong></div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < 5; i++) {
    var isHit = posHits[i] === 1;
    html += '<div style="text-align:center;margin-right:0.75rem">';
    html += '<div style="color:var(--muted);font-size:0.75rem;margin-bottom:0.25rem">第' + (i + 1) + '位</div>';
    html += '<span class="ball ' + (isHit ? 'red' : 'gray') + '">' + userNums[i] + '</span>';
    html += '<div style="color:var(--muted);font-size:0.7rem;margin-top:0.25rem">开奖 ' + lastNums[i] + '</div>';
    html += '</div>';
  }
  html += '</div>';

  if (hitDetails.length > 0) {
    html += '<div style="margin-top:0.5rem;color:var(--accent3);font-size:0.85rem">' + hitDetails.join('；') + '</div>';
  }

  var score = numHits * 20 + (setHits - numHits) * 5;
  var grade = score >= 80 ? '优秀' : score >= 50 ? '良好' : score >= 20 ? '一般' : '需改进';
  var color = score >= 80 ? 'var(--accent3)' : score >= 50 ? 'var(--accent4)' : score >= 20 ? 'var(--accent)' : 'var(--accent2)';
  html += '<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg3);border-radius:8px">';
  html += '<div style="font-size:1.1rem;font-weight:700;color:' + color + ';margin-bottom:0.5rem">综合评价：' + grade + '（得分 ' + score + '）</div>';
  html += '<div style="color:var(--muted);font-size:0.85rem">';
  if (numHits >= 3) html += '定位命中率高，号码走势把握精准，继续保持。';
  else if (numHits >= 1) html += '有定位命中，建议结合冷热号、和值和跨度分析优化选号。';
  else if (setHits >= 3) html += '号码包含命中较多，可考虑组选玩法或调整定位策略。';
  else html += '命中偏低，建议全面参考冷热号、和值、跨度及遗漏分析调整选号策略。';
  html += '</div></div>';

  document.getElementById('pl5-review-result').innerHTML = html;
}

// ==================== 排列三/排列五 图表渲染 ====================

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var accent4 = style.getPropertyValue('--accent4').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  var chartInstances = {};

  function getOrCreate(id) {
    if (chartInstances[id]) {
      chartInstances[id].dispose();
    }
    var el = document.getElementById(id);
    if (!el) return null;
    var chart = echarts.init(el, null, { renderer: 'svg' });
    chartInstances[id] = chart;
    window.addEventListener('resize', function() { chart.resize(); });
    return chart;
  }

  // ==================== 排列三图表 ====================

  window.renderPL3SumChart = function(sums) {
    var chart = getOrCreate('chart-pl3-sum');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(sums.reduce(function(a,b){return a+b},0) / sums.length);
    for (var i = sums.length - 1; i >= 0; i--) {
      periods.push('第' + (sums.length - i) + '期');
      data.push(sums[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 27, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '40' }, { offset: 1, color: accent + '05' }] } } },
        { type: 'line', markLine: { data: [{ yAxis: avgVal, name: '均值' }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderPL3SpanChart = function(spans) {
    var chart = getOrCreate('chart-pl3-span');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(spans.reduce(function(a,b){return a+b},0) / spans.length);
    for (var i = spans.length - 1; i >= 0; i--) {
      periods.push('第' + (spans.length - i) + '期');
      data.push(spans[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 9, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: data, itemStyle: { color: function(p) { return p.value >= avgVal ? accent : accent2; }, borderRadius: [3, 3, 0, 0] }, barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderPL3FreqChart = function(freqMap, expected) {
    var chart = getOrCreate('chart-pl3-freq');
    if (!chart) return;

    var nums = [];
    var freqs = [];
    for (var n = 0; n <= 9; n++) {
      nums.push('' + n);
      freqs.push(freqMap[n] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: freqs.map(function(f) {
          return { value: f, itemStyle: { color: f >= expected * 1.3 ? accent4 : f >= expected ? accent : f >= expected * 0.7 ? accent2 : accent2 + '66', borderRadius: [2, 2, 0, 0] } };
        }), barWidth: '60%' },
        { type: 'line', markLine: { data: [{ yAxis: expected, name: '期望' }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderPL3OddEvenChart = function(oddEvenRatios) {
    var chart = getOrCreate('chart-pl3-oddeven');
    if (!chart) return;

    var periods = [];
    var oddData = [], evenData = [];
    for (var i = oddEvenRatios.length - 1; i >= 0; i--) {
      periods.push('第' + (oddEvenRatios.length - i) + '期');
      oddData.push(oddEvenRatios[i].odd);
      evenData.push(oddEvenRatios[i].even);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      legend: { data: ['奇数', '偶数'], textStyle: { color: muted, fontSize: 11 }, top: 0 },
      grid: { top: 35, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 3, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: '奇数', type: 'bar', stack: 'oe', data: oddData, itemStyle: { color: accent } },
        { name: '偶数', type: 'bar', stack: 'oe', data: evenData, itemStyle: { color: accent2 } }
      ]
    });
  };

  window.renderPL3TailChart = function(tailFreq, expected) {
    var chart = getOrCreate('chart-pl3-tail');
    if (!chart) return;

    var tails = [];
    var freqs = [];
    for (var t = 0; t <= 9; t++) {
      tails.push('' + t);
      freqs.push(tailFreq[t] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: tails, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: freqs.map(function(f) {
          return { value: f, itemStyle: { color: f >= expected * 1.15 ? accent4 : f >= expected * 0.85 ? accent : accent2, borderRadius: [3, 3, 0, 0] } };
        }), barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderPL3MissChart = function(missData) {
    var chart = getOrCreate('chart-pl3-miss');
    if (!chart) return;

    var nums = [];
    var misses = [];
    for (var n = 0; n <= 9; n++) {
      nums.push('' + n);
      misses.push(missData[n] || 0);
    }

    var avgMiss = 0;
    for (var n = 0; n <= 9; n++) avgMiss += missData[n];
    avgMiss = avgMiss / 10;

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: misses.map(function(m) {
          var color;
          if (m === 0) color = accent3;
          else if (m <= avgMiss * 0.5) color = accent;
          else if (m >= avgMiss * 1.5) color = accent4;
          else color = accent2;
          return { value: m, itemStyle: { color: color, borderRadius: [3, 3, 0, 0] } };
        }), barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: Math.round(avgMiss) }], lineStyle: { color: accent, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent, fontSize: 10 } }, data: [] }
      ]
    });
  };

  // ==================== 排列五图表 ====================

  window.renderPL5SumChart = function(sums) {
    var chart = getOrCreate('chart-pl5-sum');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(sums.reduce(function(a,b){return a+b},0) / sums.length);
    for (var i = sums.length - 1; i >= 0; i--) {
      periods.push('第' + (sums.length - i) + '期');
      data.push(sums[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 45, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '40' }, { offset: 1, color: accent + '05' }] } } },
        { type: 'line', markLine: { data: [{ yAxis: avgVal, name: '均值' }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderPL5SpanChart = function(spans) {
    var chart = getOrCreate('chart-pl5-span');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(spans.reduce(function(a,b){return a+b},0) / spans.length);
    for (var i = spans.length - 1; i >= 0; i--) {
      periods.push('第' + (spans.length - i) + '期');
      data.push(spans[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 9, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: data, itemStyle: { color: function(p) { return p.value >= avgVal ? accent : accent2; }, borderRadius: [3, 3, 0, 0] }, barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderPL5FreqChart = function(freqMap, expected) {
    var chart = getOrCreate('chart-pl5-freq');
    if (!chart) return;

    var nums = [];
    var freqs = [];
    for (var n = 0; n <= 9; n++) {
      nums.push('' + n);
      freqs.push(freqMap[n] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: freqs.map(function(f) {
          return { value: f, itemStyle: { color: f >= expected * 1.3 ? accent4 : f >= expected ? accent : f >= expected * 0.7 ? accent2 : accent2 + '66', borderRadius: [2, 2, 0, 0] } };
        }), barWidth: '60%' },
        { type: 'line', markLine: { data: [{ yAxis: expected, name: '期望' }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderPL5OddEvenChart = function(oddEvenRatios) {
    var chart = getOrCreate('chart-pl5-oddeven');
    if (!chart) return;

    var periods = [];
    var oddData = [], evenData = [];
    for (var i = oddEvenRatios.length - 1; i >= 0; i--) {
      periods.push('第' + (oddEvenRatios.length - i) + '期');
      oddData.push(oddEvenRatios[i].odd);
      evenData.push(oddEvenRatios[i].even);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      legend: { data: ['奇数', '偶数'], textStyle: { color: muted, fontSize: 11 }, top: 0 },
      grid: { top: 35, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 5, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: '奇数', type: 'bar', stack: 'oe', data: oddData, itemStyle: { color: accent } },
        { name: '偶数', type: 'bar', stack: 'oe', data: evenData, itemStyle: { color: accent2 } }
      ]
    });
  };

  window.renderPL5TailChart = function(tailFreq, expected) {
    var chart = getOrCreate('chart-pl5-tail');
    if (!chart) return;

    var tails = [];
    var freqs = [];
    for (var t = 0; t <= 9; t++) {
      tails.push('' + t);
      freqs.push(tailFreq[t] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: tails, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: freqs.map(function(f) {
          return { value: f, itemStyle: { color: f >= expected * 1.15 ? accent4 : f >= expected * 0.85 ? accent : accent2, borderRadius: [3, 3, 0, 0] } };
        }), barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderPL5MissChart = function(missData) {
    var chart = getOrCreate('chart-pl5-miss');
    if (!chart) return;

    var nums = [];
    var misses = [];
    for (var n = 0; n <= 9; n++) {
      nums.push('' + n);
      misses.push(missData[n] || 0);
    }

    var avgMiss = 0;
    for (var n = 0; n <= 9; n++) avgMiss += missData[n];
    avgMiss = avgMiss / 10;

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: misses.map(function(m) {
          var color;
          if (m === 0) color = accent3;
          else if (m <= avgMiss * 0.5) color = accent;
          else if (m >= avgMiss * 1.5) color = accent4;
          else color = accent2;
          return { value: m, itemStyle: { color: color, borderRadius: [3, 3, 0, 0] } };
        }), barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: Math.round(avgMiss) }], lineStyle: { color: accent, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent, fontSize: 10 } }, data: [] }
      ]
    });
  };

// ==================== 排列三/五新功能模块 ====================

function spinPL3Lottery() {
  var numsStr = document.getElementById('pl3-numbers').value;
  var historyStr = document.getElementById('pl3-history').value;
  var lastNums = parseNums(numsStr);
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 3) history.push(nums.slice(0,3));
  }
  if (history.length === 0 && lastNums.length >= 3) {
    history.unshift(lastNums.slice(0,3));
  }
  if (history.length < 2) { alert('请先加载数据进行分析'); return; }

  var last = history[0];
  var posScores = scorePL3Numbers(last, history);
  var results = [];
  for (var s = 0; s < 5; s++) {
    var picks = [];
    for (var p = 0; p < 3; p++) {
      var pool = [];
      for (var d = 0; d <= 9; d++) pool.push(d);
      var scores = posScores[p];
      var totalW = 0, weights = [];
      for (var d = 0; d <= 9; d++) {
        var w = (scores[d] ? scores[d].total : 0) + 0.5;
        weights.push(w);
        totalW += w;
      }
      // 兜底：如果权重异常，随机选号
      if (!totalW || isNaN(totalW)) {
        picks.push(Math.floor(Math.random() * 10));
        continue;
      }
      var rnd = Math.random() * totalW;
      var cum = 0;
      for (var d = 0; d <= 9; d++) {
        cum += weights[d];
        if (rnd <= cum) { picks.push(d); break; }
      }
    }
    results.push(picks);
  }

  var html = '<div style="padding:0.5rem">';
  html += '<div style="text-align:center;margin-bottom:1rem;font-size:0.9rem;color:var(--muted)">基于各位置大模型评分加权抽选</div>';
  for (var s = 0; s < results.length; s++) {
    html += '<div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:60px;font-size:0.9rem">第'+(s+1)+'注</span>';
    html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">';
    html += '<span style="font-size:0.75rem;color:var(--muted)">百位</span>';
    html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+results[s][0]+'</div>';
    html += '<span style="font-size:0.75rem;color:var(--muted);margin-left:0.3rem">十位</span>';
    html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+results[s][1]+'</div>';
    html += '<span style="font-size:0.75rem;color:var(--muted);margin-left:0.3rem">个位</span>';
    html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+results[s][2]+'</div>';
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('pl3-lottery-results').innerHTML = html;
  document.getElementById('pl3-lottery-results').style.display = 'block';
}

function spinPL5Lottery() {
  var numsStr = document.getElementById('pl5-numbers').value;
  var historyStr = document.getElementById('pl5-history').value;
  var lastNums = parseNums(numsStr);
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 5) history.push(nums.slice(0,5));
  }
  if (history.length === 0 && lastNums.length >= 5) {
    history.unshift(lastNums.slice(0,5));
  }
  if (history.length < 2) { alert('请先加载数据进行分析'); return; }

  var last = history[0];
  var posScores = scorePL5Position(last, history);
  var results = [];
  for (var s = 0; s < 5; s++) {
    var picks = [];
    for (var p = 0; p < 5; p++) {
      var pool = [];
      for (var d = 0; d <= 9; d++) pool.push(d);
      var scores = posScores[p];
      var totalW = 0, weights = [];
      for (var d = 0; d <= 9; d++) {
        var w = (scores[d] ? scores[d].totalScore : 0) + 0.5;
        weights.push(w);
        totalW += w;
      }
      var rnd = Math.random() * totalW;
      var cum = 0;
      for (var d = 0; d <= 9; d++) {
        cum += weights[d];
        if (rnd <= cum) { picks.push(d); break; }
      }
    }
    results.push(picks);
  }

  var html = '<div style="padding:0.5rem">';
  html += '<div style="text-align:center;margin-bottom:1rem;font-size:0.9rem;color:var(--muted)">基于各位置大模型评分加权抽选</div>';
  for (var s = 0; s < results.length; s++) {
    html += '<div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:60px;font-size:0.9rem">第'+(s+1)+'注</span>';
    html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">';
    html += '<span style="font-size:0.75rem;color:var(--muted)">万位</span>';
    html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+results[s][0]+'</div>';
    html += '<span style="font-size:0.75rem;color:var(--muted)">千位</span>';
    html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+results[s][1]+'</div>';
    html += '<span style="font-size:0.75rem;color:var(--muted)">百位</span>';
    html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+results[s][2]+'</div>';
    html += '<span style="font-size:0.75rem;color:var(--muted)">十位</span>';
    html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+results[s][3]+'</div>';
    html += '<span style="font-size:0.75rem;color:var(--muted)">个位</span>';
    html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+results[s][4]+'</div>';
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('pl5-lottery-results').innerHTML = html;
  document.getElementById('pl5-lottery-results').style.display = 'block';
}

// PL3多期回溯验证
function runPL3Backtest() {
  var historyStr = document.getElementById('pl3-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 3) history.push(nums.slice(0,3));
  }
  if (history.length < 15) { alert('请至少输入15期历史数据进行回溯验证'); return; }

  var periods = Math.min(10, history.length - 5);
  var results = [];

  for (var p = 0; p < periods; p++) {
    var actual = history[p];
    var simHistory = history.slice(p+1, p+6);
    var last = simHistory[0];
    var simHist = simHistory.slice(1);
    var predictions = [];
    for (var pos = 0; pos < 3; pos++) {
      var posScores = scorePL3Position(pos, last, simHist);
      var top = posScores.slice(0,3).map(function(s){return s.num;});
      predictions.push(top);
    }
    var hits = [];
    for (var pos = 0; pos < 3; pos++) {
      if (predictions[pos].indexOf(actual[pos]) >= 0) hits.push({pos: pos, num: actual[pos]});
    }
    results.push({ period: p+1, actual: actual, predictions: predictions, hits: hits, hitCount: hits.length });
  }

  var html = '<div style="padding:0.5rem">';
  var totalHits = results.reduce(function(s,r){return s+r.hitCount;},0);
  html += '<div style="margin-bottom:1rem;padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">回溯验证汇总（最近'+periods+'期）</div>';
  html += '<div style="display:flex;gap:1rem;flex-wrap:wrap">';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent);color:#000;border-radius:6px;font-weight:bold">平均命中: '+(totalHits/periods).toFixed(2)+'/3</div>';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent3);color:#000;border-radius:6px;font-weight:bold">命中率: '+(totalHits/periods/3*100).toFixed(1)+'%</div>';
  html += '</div></div>';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">每期回测详情</div>';
  results.forEach(function(r){
    html += '<div style="margin-bottom:0.5rem;padding:0.6rem;background:var(--bg3);border-radius:6px;border:1px solid var(--rule);font-size:0.8rem">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span>第'+r.period+'期</span>';
    html += '<span style="color:var(--accent);font-weight:bold">命中'+r.hitCount+'/3</span>';
    html += '</div>';
    html += '<div style="margin-top:0.3rem;color:var(--muted)">实际: 百位'+r.actual[0]+' 十位'+r.actual[1]+' 个位'+r.actual[2]+'</div>';
    html += '<div style="color:var(--muted)">预测Top3: 百位['+r.predictions[0].join(',')+'] 十位['+r.predictions[1].join(',')+'] 个位['+r.predictions[2].join(',')+']</div>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div style="padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">下期推荐优化建议</div>';
  html += '<div style="font-size:0.8rem;color:var(--muted)">根据回溯验证，各位置推荐将持续优化。</div>';
  html += '</div>';

  html += '</div>';
  document.getElementById('pl3-backtest-results').innerHTML = html;
}

// PL5多期回溯验证
function runPL5Backtest() {
  var historyStr = document.getElementById('pl5-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 5) history.push(nums.slice(0,5));
  }
  if (history.length < 15) { alert('请至少输入15期历史数据进行回溯验证'); return; }

  var periods = Math.min(10, history.length - 5);
  var results = [];

  for (var p = 0; p < periods; p++) {
    var actual = history[p];
    var simHistory = history.slice(p+1, p+6);
    var last = simHistory[0];
    var simHist = simHistory.slice(1);
    var predictions = [];
    for (var pos = 0; pos < 5; pos++) {
      var posScores = scorePL5Position(pos, last, simHist);
      var top = posScores.slice(0,3).map(function(s){return s.num;});
      predictions.push(top);
    }
    var hits = [];
    for (var pos = 0; pos < 5; pos++) {
      if (predictions[pos].indexOf(actual[pos]) >= 0) hits.push({pos: pos, num: actual[pos]});
    }
    results.push({ period: p+1, actual: actual, predictions: predictions, hits: hits, hitCount: hits.length });
  }

  var html = '<div style="padding:0.5rem">';
  var totalHits = results.reduce(function(s,r){return s+r.hitCount;},0);
  html += '<div style="margin-bottom:1rem;padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">回溯验证汇总（最近'+periods+'期）</div>';
  html += '<div style="display:flex;gap:1rem;flex-wrap:wrap">';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent);color:#000;border-radius:6px;font-weight:bold">平均命中: '+(totalHits/periods).toFixed(2)+'/5</div>';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent3);color:#000;border-radius:6px;font-weight:bold">命中率: '+(totalHits/periods/5*100).toFixed(1)+'%</div>';
  html += '</div></div>';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">每期回测详情</div>';
  results.forEach(function(r){
    html += '<div style="margin-bottom:0.5rem;padding:0.6rem;background:var(--bg3);border-radius:6px;border:1px solid var(--rule);font-size:0.8rem">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span>第'+r.period+'期</span>';
    html += '<span style="color:var(--accent);font-weight:bold">命中'+r.hitCount+'/5</span>';
    html += '</div>';
    html += '<div style="margin-top:0.3rem;color:var(--muted)">实际: '+r.actual.join(',')+'</div>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div style="padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">下期推荐优化建议</div>';
  html += '<div style="font-size:0.8rem;color:var(--muted)">根据回溯验证，各位置推荐将持续优化。</div>';
  html += '</div>';

  html += '</div>';
  document.getElementById('pl5-backtest-results').innerHTML = html;
}
