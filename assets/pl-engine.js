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
  document.getElementById('pl3-review-numbers').value = last.numbers.join(',');
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
  renderPL3Recommend(last, history);

  document.getElementById('pl3-results').scrollIntoView({ behavior: 'smooth' });
}

function renderPL3Stats(last, history) {
  var s = sum(last);
  var sp = span(last);
  var sums = history.map(function(h) { return sum(h); });
  var oddCount = last.filter(function(n) { return n % 2 === 1; }).length;
  var bigCount = last.filter(function(n) { return n >= 5; }).length;

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + s + '</div><div class="stat-label">上期和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + sp + '</div><div class="stat-label">上期跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + oddCount + ':' + (3 - oddCount) + '</div><div class="stat-label">奇偶比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + bigCount + ':' + (3 - bigCount) + '</div><div class="stat-label">大小比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">上期开奖号码</div>';
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
  var totalPeriods = history.length;
  var expected = (3 / 10) * totalPeriods;
  var scores = [];

  for (var n = 0; n <= 9; n++) {
    var score = { num: n, freqScore: 0, missScore: 0, repeatScore: 0, total: 0, reasons: [] };

    // 1. Frequency score (30%)
    var freq = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) freq++;
    }
    score.freqScore = Math.min(30, (freq / Math.max(1, expected)) * 30);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');
    else if (freq >= expected) score.reasons.push('温号稳定');

    // 2. Missing score (25%)
    var miss = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === history.length) miss = history.length;
    var avgMiss = Math.round(10 / 3);
    if (miss >= avgMiss * 0.8 && miss <= avgMiss * 2) {
      score.missScore = Math.min(25, (miss / avgMiss) * 25);
      if (miss >= avgMiss) score.reasons.push('遗漏回补号');
    } else if (miss > avgMiss * 2) {
      score.missScore = 10;
      score.reasons.push('超长遗漏');
    } else {
      score.missScore = 12;
    }

    // 3. Repeat score (25%)
    if (last.indexOf(n) >= 0) {
      score.repeatScore = 25;
      score.reasons.push('上期重号候选');
    } else {
      for (var i = 0; i < last.length; i++) {
        if (Math.abs(n - last[i]) === 1) {
          score.repeatScore = 12;
          score.reasons.push('邻号关联');
          break;
        }
      }
    }

    // 4. Odd/even balance (10%)
    var lastOdd = last.filter(function(x) { return x % 2 === 1; }).length;
    var isOdd = n % 2 === 1;
    if (lastOdd >= 2 && !isOdd) {
      score.total += 10;
      score.reasons.push('偶数回补');
    } else if (lastOdd <= 1 && isOdd) {
      score.total += 10;
      score.reasons.push('奇数回补');
    } else {
      score.total += 5;
    }

    // 5. Big/small balance (10%)
    var lastBig = last.filter(function(x) { return x >= 5; }).length;
    var isBig = n >= 5;
    if (lastBig >= 2 && !isBig) {
      score.total += 10;
      score.reasons.push('小数回补');
    } else if (lastBig <= 1 && isBig) {
      score.total += 10;
      score.reasons.push('大数回补');
    } else {
      score.total += 5;
    }

    score.total = score.freqScore + score.missScore + score.repeatScore + score.total;
    scores.push(score);
  }

  return scores;
}

function renderPL3Recommend(last, history) {
  var scores = scorePL3Numbers(last, history);
  scores.sort(function(a, b) { return b.total - a.total; });

  var html = '';

  for (var set = 0; set < 3; set++) {
    var picks = [];
    var usedNums = {};

    // Pick top scorer
    picks.push(scores[set].num);
    usedNums[scores[set].num] = true;

    // Fill remaining 2 from top scores
    for (var i = 0; i < scores.length && picks.length < 3; i++) {
      var n = scores[i].num;
      if (!usedNums[n]) {
        picks.push(n);
        usedNums[n] = true;
      }
    }

    html += '<div style="margin-bottom:1.25rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">推荐方案 ' + (set + 1) + '</div>';
    html += '<div class="ball-row">';
    for (var i = 0; i < picks.length; i++) {
      html += '<div class="ball red">' + picks[i] + '</div>';
    }
    html += '</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem">和值: ' + sum(picks) + ' | 跨度: ' + span(picks) + ' | 奇偶: ' + picks.filter(function(x){return x%2===1}).length + ':' + picks.filter(function(x){return x%2===0}).length + ' | 大小: ' + picks.filter(function(x){return x>=5}).length + ':' + picks.filter(function(x){return x<5}).length + '</div>';
    html += '</div>';
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
  document.getElementById('pl5-review-numbers').value = last.numbers.join(',');
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
  renderPL5Recommend(last, history);

  document.getElementById('pl5-results').scrollIntoView({ behavior: 'smooth' });
}

function renderPL5Stats(last, history) {
  var s = sum(last);
  var sp = span(last);
  var sums = history.map(function(h) { return sum(h); });
  var oddCount = last.filter(function(n) { return n % 2 === 1; }).length;
  var bigCount = last.filter(function(n) { return n >= 5; }).length;

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + s + '</div><div class="stat-label">上期和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + sp + '</div><div class="stat-label">上期跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + oddCount + ':' + (5 - oddCount) + '</div><div class="stat-label">奇偶比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + bigCount + ':' + (5 - bigCount) + '</div><div class="stat-label">大小比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">上期开奖号码</div>';
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
  var totalPeriods = history.length;
  var expected = (5 / 10) * totalPeriods;
  var scores = [];

  for (var n = 0; n <= 9; n++) {
    var score = { num: n, freqScore: 0, missScore: 0, repeatScore: 0, total: 0, reasons: [] };

    // 1. Frequency score (30%)
    var freq = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) freq++;
    }
    score.freqScore = Math.min(30, (freq / Math.max(1, expected)) * 30);
    if (freq >= expected * 1.3) score.reasons.push('高频热号');
    else if (freq >= expected) score.reasons.push('温号稳定');

    // 2. Missing score (25%)
    var miss = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].indexOf(n) >= 0) break;
      miss++;
    }
    if (miss === history.length) miss = history.length;
    var avgMiss = Math.round(10 / 5);
    if (miss >= avgMiss * 0.8 && miss <= avgMiss * 2) {
      score.missScore = Math.min(25, (miss / avgMiss) * 25);
      if (miss >= avgMiss) score.reasons.push('遗漏回补号');
    } else if (miss > avgMiss * 2) {
      score.missScore = 10;
      score.reasons.push('超长遗漏');
    } else {
      score.missScore = 12;
    }

    // 3. Repeat score (25%)
    if (last.indexOf(n) >= 0) {
      score.repeatScore = 25;
      score.reasons.push('上期重号候选');
    } else {
      for (var i = 0; i < last.length; i++) {
        if (Math.abs(n - last[i]) === 1) {
          score.repeatScore = 12;
          score.reasons.push('邻号关联');
          break;
        }
      }
    }

    // 4. Odd/even balance (10%)
    var lastOdd = last.filter(function(x) { return x % 2 === 1; }).length;
    var isOdd = n % 2 === 1;
    if (lastOdd >= 3 && !isOdd) {
      score.total += 10;
      score.reasons.push('偶数回补');
    } else if (lastOdd <= 2 && isOdd) {
      score.total += 10;
      score.reasons.push('奇数回补');
    } else {
      score.total += 5;
    }

    // 5. Big/small balance (10%)
    var lastBig = last.filter(function(x) { return x >= 5; }).length;
    var isBig = n >= 5;
    if (lastBig >= 3 && !isBig) {
      score.total += 10;
      score.reasons.push('小数回补');
    } else if (lastBig <= 2 && isBig) {
      score.total += 10;
      score.reasons.push('大数回补');
    } else {
      score.total += 5;
    }

    score.total = score.freqScore + score.missScore + score.repeatScore + score.total;
    scores.push(score);
  }

  return scores;
}

function renderPL5Recommend(last, history) {
  var scores = scorePL5Numbers(last, history);
  scores.sort(function(a, b) { return b.total - a.total; });

  var html = '';

  for (var set = 0; set < 3; set++) {
    var picks = [];
    var usedNums = {};

    // Pick top scorer
    picks.push(scores[set].num);
    usedNums[scores[set].num] = true;

    // Fill remaining 4 from top scores
    for (var i = 0; i < scores.length && picks.length < 5; i++) {
      var n = scores[i].num;
      if (!usedNums[n]) {
        picks.push(n);
        usedNums[n] = true;
      }
    }

    html += '<div style="margin-bottom:1.25rem">';
    html += '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.4rem">推荐方案 ' + (set + 1) + '</div>';
    html += '<div class="ball-row">';
    for (var i = 0; i < picks.length; i++) {
      html += '<div class="ball red">' + picks[i] + '</div>';
    }
    html += '</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem">和值: ' + sum(picks) + ' | 跨度: ' + span(picks) + ' | 奇偶: ' + picks.filter(function(x){return x%2===1}).length + ':' + picks.filter(function(x){return x%2===0}).length + ' | 大小: ' + picks.filter(function(x){return x>=5}).length + ':' + picks.filter(function(x){return x<5}).length + '</div>';
    html += '</div>';
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

  var html = '<div style="margin-bottom:0.5rem"><strong>上期开奖：</strong>' + lastNums.join(',') + '</div>';
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

  var html = '<div style="margin-bottom:0.5rem"><strong>上期开奖：</strong>' + lastNums.join(',') + '</div>';
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

(function() {
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

})();
