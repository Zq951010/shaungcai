/**
 * 彩票预测分析引擎
 * 支持大乐透(DLT)、双色球(SSQ)、快乐8(KL8)
 * 分析维度：重号规律、区间比、和值、跨度、冷热号、胆码/拖码推荐
 */

// ==================== 工具函数 ====================

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function parseNums(str) {
  if (!str || !str.trim()) return [];
  return str.split(/[,，\s]+/).map(function(s) { return parseInt(s.trim(), 10); }).filter(function(n) { return !isNaN(n) && n > 0; });
}

function sum(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return s; }
function avg(arr) { return arr.length ? sum(arr) / arr.length : 0; }
function max(arr) { return Math.max.apply(null, arr); }
function min(arr) { return Math.min.apply(null, arr); }
function span(arr) { return arr.length ? max(arr) - min(arr) : 0; }

function intersection(a, b) {
  var set = {};
  for (var i = 0; i < b.length; i++) set[b[i]] = true;
  return a.filter(function(x) { return set[x]; });
}

function complement(full, subset) {
  var set = {};
  for (var i = 0; i < subset.length; i++) set[subset[i]] = true;
  return full.filter(function(x) { return !set[x]; });
}

function range(a, b) {
  var r = [];
  for (var i = a; i <= b; i++) r.push(i);
  return r;
}

// ==================== 大乐透分析 ====================

var DLT_ZONES = [[1,12],[13,23],[24,35]];
var DLT_BACK_ZONES = [[1,4],[5,8],[9,12]];

var dltSampleHistory = [
  '04,10,22,23,33|02,12',
  '03,11,12,21,22|06,10',
  '06,16,18,19,28|07,11',
  '10,13,19,21,30|04,05',
  '04,11,12,13,25|04,08',
  '03,13,15,17,21|02,07',
  '03,15,20,29,31|01,12',
  '07,15,20,24,29|04,10',
  '10,12,26,31,35|02,12',
  '22,28,30,31,34|01,05',
  '06,13,17,19,26|07,08',
  '07,12,13,18,34|01,05',
  '23,25,26,27,34|04,10',
  '06,07,18,21,30|01,05',
  '09,10,20,33,35|04,11',
  '02,06,14,22,24|08,11',
  '02,09,14,20,31|05,09',
  '02,03,20,28,33|02,12',
  '13,18,28,32,33|02,11',
  '06,10,14,23,33|08,10',
  '01,06,14,15,17|02,03',
  '11,17,20,23,35|01,10',
  '09,20,21,23,28|06,11',
  '01,13,18,27,33|04,07',
  '01,15,21,26,33|04,07',
  '03,08,22,26,29|07,10',
  '08,12,14,19,22|11,12',
  '02,07,13,19,24|03,08',
  '24,25,27,29,34|02,06',
  '06,12,13,21,34|08,09',
  '09,11,20,26,27|06,09',
  '08,17,21,33,35|06,07'
];

function loadDLTSample() {
  var last = dltSampleHistory[0];
  var parts = last.split('|');
  document.getElementById('dlt-front').value = parts[0];
  document.getElementById('dlt-back').value = parts[1];
  document.getElementById('dlt-history').value = dltSampleHistory.join('\n');
  // 填充复盘输入框默认值（推荐号码第一组）
  var sampleFront = parts[0].split(',').slice(0,5).join(',');
  var sampleBack = parts[1].split(',').slice(0,2).join(',');
  document.getElementById('dlt-review-numbers').value = sampleFront;
  document.getElementById('dlt-review-blue').value = sampleBack;
}

function clearDLT() {
  document.getElementById('dlt-front').value = '';
  document.getElementById('dlt-back').value = '';
  document.getElementById('dlt-history').value = '';
  document.getElementById('dlt-results').style.display = 'none';
  document.getElementById('dlt-empty').style.display = 'block';
}

function analyzeDLT() {
  var frontStr = document.getElementById('dlt-front').value;
  var backStr = document.getElementById('dlt-back').value;
  var historyStr = document.getElementById('dlt-history').value;

  var lastFront = parseNums(frontStr);
  var lastBack = parseNums(backStr);

  if (lastFront.length < 5 || lastBack.length < 2) {
    if (!historyStr.trim()) { alert('请至少输入上期开奖号码'); return; }
  }

  // Parse history
  var lines = historyStr.trim().split('\n').filter(function(l) { return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var f = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (f.length >= 5 && b.length >= 2) {
      history.push({ front: f.slice(0, 5).sort(function(a,b){return a-b}), back: b.slice(0, 2).sort(function(a,b){return a-b}) });
    }
  }

  // If no history parsed but we have last numbers, use them as single entry
  if (history.length === 0 && lastFront.length >= 5 && lastBack.length >= 2) {
    history.unshift({ front: lastFront.slice(0,5).sort(function(a,b){return a-b}), back: lastBack.slice(0,2).sort(function(a,b){return a-b}) });
  }

  if (history.length < 2) {
    alert('请至少输入2期历史数据以进行有效分析');
    return;
  }

  var last = history[0];
  var allFronts = history.map(function(h) { return h.front; });
  var allBacks = history.map(function(h) { return h.back; });

  // Show results
  document.getElementById('dlt-empty').style.display = 'none';
  document.getElementById('dlt-results').style.display = 'block';

  renderDLTStats(last, history);
  renderDLTRepeat(last, history);
  renderDLTZone(allFronts);
  renderDLTSum(allFronts);
  renderDLTSpan(allFronts);
  renderDLTHotCold(allFronts, allBacks);
  renderDLTDanTuo(last, allFronts, allBacks);
  renderDLTRecommend_V3(last.front.concat(last.back), allFronts, allBacks);

  // Scroll to results
  document.getElementById('dlt-results').scrollIntoView({ behavior: 'smooth' });
}

function renderDLTStats(last, history) {
  var frontSum = sum(last.front);
  var frontSpan = span(last.front);
  var oddCount = last.front.filter(function(n) { return n % 2 === 1; }).length;
  var bigCount = last.front.filter(function(n) { return n > 17; }).length;

  var sums = history.map(function(h) { return sum(h.front); });
  var spans = history.map(function(h) { return span(h.front); });

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + frontSum + '</div><div class="stat-label">上期前区和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + frontSpan + '</div><div class="stat-label">上期前区跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + oddCount + ':' + (5 - oddCount) + '</div><div class="stat-label">奇偶比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + bigCount + ':' + (5 - bigCount) + '</div><div class="stat-label">大小比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  // Show last draw balls
  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">上期开奖号码</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < last.front.length; i++) {
    html += '<div class="ball red">' + pad(last.front[i]) + '</div>';
  }
  html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
  for (var i = 0; i < last.back.length; i++) {
    html += '<div class="ball blue">' + pad(last.back[i]) + '</div>';
  }
  html += '</div></div>';

  document.getElementById('dlt-stats').innerHTML = html;
}

function renderDLTRepeat(last, history) {
  var html = '';

  // Count repeat numbers from last period in each subsequent period
  var repeatCounts = [];
  for (var i = 1; i < history.length; i++) {
    var repeat = intersection(last.front, history[i].front).length;
    repeatCounts.push(repeat);
  }

  var avgRepeat = avg(repeatCounts).toFixed(1);

  html += '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">历史平均重号</span><span class="result-value">' + avgRepeat + ' 个</span></div>';

  // Analyze which numbers from last draw are most likely to repeat
  var repeatFreq = {};
  for (var i = 1; i < history.length; i++) {
    var prev = history[i - 1];
    var curr = history[i];
    var repeats = intersection(prev.front, curr.front);
    for (var j = 0; j < repeats.length; j++) {
      repeatFreq[repeats[j]] = (repeatFreq[repeats[j]] || 0) + 1;
    }
  }

  // Candidates from last draw
  var candidates = [];
  for (var i = 0; i < last.front.length; i++) {
    var n = last.front[i];
    var freq = repeatFreq[n] || 0;
    var reasons = [];
    if (freq >= 2) reasons.push('历史重号高频');
    // Check if consecutive appearances
    var consecutive = 0;
    for (var j = 0; j < history.length; j++) {
      if (history[j].front.indexOf(n) >= 0) consecutive++;
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
    html += '<tr><td><span class="hl-red">' + pad(c.num) + '</span></td><td>' + c.freq + '</td><td>' + c.consecutive + '</td><td>' + badge + '</td><td>' + c.reasons.map(function(r){return '<span class="reason-tag">'+r+'</span>';}).join('') + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('dlt-repeat').innerHTML = html;
}

function renderDLTZone(allFronts) {
  var html = '';
  var zoneNames = ['一区(01-12)', '二区(13-23)', '三区(24-35)'];
  var zoneCounts = [];

  for (var i = 0; i < allFronts.length; i++) {
    var counts = [0, 0, 0];
    for (var j = 0; j < allFronts[i].length; j++) {
      var n = allFronts[i][j];
      if (n >= 1 && n <= 12) counts[0]++;
      else if (n >= 13 && n <= 23) counts[1]++;
      else counts[2]++;
    }
    zoneCounts.push(counts);
  }

  // Average zone distribution
  var avgCounts = [0, 0, 0];
  for (var i = 0; i < zoneCounts.length; i++) {
    for (var j = 0; j < 3; j++) avgCounts[j] += zoneCounts[i][j];
  }
  for (var j = 0; j < 3; j++) avgCounts[j] = (avgCounts[j] / zoneCounts.length).toFixed(1);

  html += '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">平均区间比</span><span class="result-value">' + avgCounts.join(' : ') + '</span></div>';

  // Last period zone ratio
  var lastZone = zoneCounts[0];
  html += '<div class="result-row"><span class="result-label">上期区间比</span><span class="result-value">' + lastZone.join(' : ') + '</span></div>';

  // Zone deficit analysis
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">区间偏移分析（近5期）</div>';
  var recentAvg = [0, 0, 0];
  var recentN = Math.min(5, zoneCounts.length);
  for (var i = 0; i < recentN; i++) {
    for (var j = 0; j < 3; j++) recentAvg[j] += zoneCounts[i][j];
  }
  for (var j = 0; j < 3; j++) recentAvg[j] = (recentAvg[j] / recentN).toFixed(1);

  html += '<div class="table-wrap"><table>';
  html += '<tr><th>区间</th><th>近5期均值</th><th>历史均值</th><th>偏移</th><th>建议</th></tr>';
  for (var j = 0; j < 3; j++) {
    var diff = (recentAvg[j] - avgCounts[j]).toFixed(1);
    var suggestion = diff < -0.3 ? '<span class="badge badge-hot">偏少，建议关注</span>' :
                     diff > 0.3 ? '<span class="badge badge-cold">偏多，注意回调</span>' :
                     '<span class="badge badge-warm">正常</span>';
    html += '<tr><td>' + zoneNames[j] + '</td><td>' + recentAvg[j] + '</td><td>' + avgCounts[j] + '</td><td>' + (diff > 0 ? '+' : '') + diff + '</td><td>' + suggestion + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('dlt-zone').innerHTML = html;

  // Chart
  renderDLTZoneChart(zoneCounts, zoneNames);
}

function renderDLTSum(allFronts) {
  var sums = allFronts.map(function(f) { return sum(f); });
  var lastSum = sums[0];
  var avgSum = Math.round(avg(sums));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期和值</span><span class="result-value">' + lastSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均和值</span><span class="result-value">' + avgSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">和值范围</span><span class="result-value">' + min(sums) + ' ~ ' + max(sums) + '</span></div>';

  var diff = lastSum - avgSum;
  var trend = diff > 15 ? '偏高，下期可能回落' : diff < -15 ? '偏低，下期可能回升' : '正常波动范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';

  // Suggested sum range
  var sugMin = Math.max(30, avgSum - 15);
  var sugMax = Math.min(155, avgSum + 15);
  html += '<div class="result-row"><span class="result-label">建议和值范围</span><span class="result-value hl-gold">' + sugMin + ' ~ ' + sugMax + '</span></div>';
  html += '</div>';

  document.getElementById('dlt-sum').innerHTML = html;
  renderDLTSumChart(sums);
}

function renderDLTSpan(allFronts) {
  var spans = allFronts.map(function(f) { return span(f); });
  var lastSp = spans[0];
  var avgSp = Math.round(avg(spans));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期跨度</span><span class="result-value">' + lastSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均跨度</span><span class="result-value">' + avgSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">跨度范围</span><span class="result-value">' + min(spans) + ' ~ ' + max(spans) + '</span></div>';

  var diff = lastSp - avgSp;
  var trend = diff > 5 ? '偏大，下期可能缩小' : diff < -5 ? '偏小，下期可能扩大' : '正常范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';

  var sugMin = Math.max(10, avgSp - 5);
  var sugMax = Math.min(34, avgSp + 5);
  html += '<div class="result-row"><span class="result-label">建议跨度范围</span><span class="result-value hl-gold">' + sugMin + ' ~ ' + sugMax + '</span></div>';
  html += '</div>';

  document.getElementById('dlt-span').innerHTML = html;
  renderDLTSpanChart(spans);
}

function renderDLTHotCold(allFronts, allBacks) {
  var freqMap = {};
  for (var i = 1; i <= 35; i++) freqMap[i] = 0;
  for (var i = 0; i < allFronts.length; i++) {
    for (var j = 0; j < allFronts[i].length; j++) {
      freqMap[allFronts[i][j]]++;
    }
  }

  // Back area frequency
  var backFreqMap = {};
  for (var i = 1; i <= 12; i++) backFreqMap[i] = 0;
  for (var i = 0; i < allBacks.length; i++) {
    for (var j = 0; j < allBacks[i].length; j++) {
      backFreqMap[allBacks[i][j]]++;
    }
  }

  var totalPeriods = allFronts.length;
  var expected = (5 / 35) * totalPeriods;

  // Classify
  var hot = [], warm = [], cold = [];
  for (var n = 1; n <= 35; n++) {
    var f = freqMap[n];
    if (f >= expected * 1.3) hot.push({ num: n, freq: f });
    else if (f <= expected * 0.7) cold.push({ num: n, freq: f });
    else warm.push({ num: n, freq: f });
  }
  hot.sort(function(a, b) { return b.freq - a.freq; });
  cold.sort(function(a, b) { return a.freq - b.freq; });

  var html = '<div class="result-section">';
  html += '<div style="margin-bottom:1rem;color:var(--muted);font-size:0.85rem">理论期望频次: ' + expected.toFixed(1) + ' 次/' + totalPeriods + '期</div>';

  // Hot numbers
  html += '<div style="margin-bottom:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号 (' + hot.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < hot.length; i++) {
    html += '<div class="ball red hot tooltip" data-tip="' + hot[i].freq + '次">' + pad(hot[i].num) + '</div>';
  }
  html += '</div></div>';

  // Cold numbers
  html += '<div style="margin-bottom:1rem"><span class="badge badge-cold" style="margin-right:0.5rem">冷号 (' + cold.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < cold.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + cold[i].freq + '次">' + pad(cold[i].num) + '</div>';
  }
  html += '</div></div>';

  // Back area hot/cold
  var backExpected = (2 / 12) * totalPeriods;
  var backHot = [], backCold = [];
  for (var n = 1; n <= 12; n++) {
    if (backFreqMap[n] >= backExpected * 1.3) backHot.push({ num: n, freq: backFreqMap[n] });
    else if (backFreqMap[n] <= backExpected * 0.7) backCold.push({ num: n, freq: backFreqMap[n] });
  }

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">后区号码分析</div>';
  html += '<div style="margin-bottom:0.5rem"><span class="badge badge-hot" style="margin-right:0.5rem">后区热号</span><div class="ball-row">';
  for (var i = 0; i < backHot.length; i++) {
    html += '<div class="ball blue hot tooltip" data-tip="' + backHot[i].freq + '次">' + pad(backHot[i].num) + '</div>';
  }
  html += '</div></div>';
  html += '<div><span class="badge badge-cold" style="margin-right:0.5rem">后区冷号</span><div class="ball-row">';
  for (var i = 0; i < backCold.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + backCold[i].freq + '次">' + pad(backCold[i].num) + '</div>';
  }
  html += '</div></div>';

  html += '</div>';

  document.getElementById('dlt-hotcold').innerHTML = html;
  renderDLTFreqChart(freqMap, expected);
}

// ========== Canvas Charts ==========
function createChartCanvas(containerId, height) {
  var container = document.getElementById(containerId);
  if (!container) return null;
  container.innerHTML = '';
  var W = container.clientWidth || 700;
  var H = height;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  container.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas: canvas, ctx: ctx, width: W, height: H };
}

function renderDLTZoneChart(zoneCounts, zoneNames) {
  var H = 300;
  var chart = createChartCanvas('chart-dlt-zone', H);
  if (!chart) return;
  var ctx = chart.ctx, W = chart.width;
  var padL = 50, padR = 20, padT = 30, padB = 40;
  var w = W - padL - padR, h = H - padT - padB;
  var n = zoneCounts.length;
  var barW = w / n * 0.6;
  var colors = ['#ef4444', '#f59e0b', '#3b82f6'];

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (var i = 0; i <= 5; i++) {
    var y = padT + h - (i / 5) * h;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + w, y);
    ctx.stroke();
  }

  for (var i = 0; i < n; i++) {
    var x = padL + (i + 0.5) * (w / n);
    var idx = n - 1 - i;
    var startY = padT + h;
    for (var z = 0; z < 3; z++) {
      var bh = (zoneCounts[idx][z] / 5) * h;
      ctx.fillStyle = colors[z];
      ctx.fillRect(x - barW / 2, startY - bh, barW, bh);
      startY -= bh;
    }
  }

  ctx.fillStyle = '#6b7280';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  for (var i = 0; i < n; i++) {
    var x = padL + (i + 0.5) * (w / n);
    ctx.fillText((n - i) + '期前', x, H - 10);
  }

  ctx.textAlign = 'right';
  for (var i = 0; i <= 5; i++) {
    var y = padT + h - (i / 5) * h;
    ctx.fillText(i, padL - 8, y + 4);
  }

  ctx.textAlign = 'left';
  for (var z = 0; z < 3; z++) {
    ctx.fillStyle = colors[z];
    ctx.fillRect(padL + z * 100, 8, 12, 12);
    ctx.fillStyle = '#1f2937';
    ctx.fillText(zoneNames[z], padL + z * 100 + 18, 18);
  }
}

function renderDLTSumChart(sums) {
  var H = 260;
  var chart = createChartCanvas('chart-dlt-sum', H);
  if (!chart) return;
  var ctx = chart.ctx, W = chart.width;
  var padL = 50, padR = 20, padT = 30, padB = 40;
  var w = W - padL - padR, h = H - padT - padB;
  var n = sums.length;
  var minS = Math.min.apply(null, sums);
  var maxS = Math.max.apply(null, sums);
  var range = maxS - minS || 1;
  var yMin = Math.max(0, minS - range * 0.2);
  var yMax = maxS + range * 0.2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  var steps = 5;
  for (var i = 0; i <= steps; i++) {
    var y = padT + h - (i / steps) * h;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var x = padL + (i / (n - 1 || 1)) * w;
    var y = padT + h - ((sums[n - 1 - i] - yMin) / (yMax - yMin)) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  for (var i = 0; i < n; i++) {
    var x = padL + (i / (n - 1 || 1)) * w;
    var y = padT + h - ((sums[n - 1 - i] - yMin) / (yMax - yMin)) * h;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#6b7280';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  var xStep = Math.max(1, Math.floor(n / 6));
  for (var i = 0; i < n; i += xStep) {
    var x = padL + (i / (n - 1 || 1)) * w;
    ctx.fillText((n - i) + '期前', x, H - 10);
  }

  ctx.textAlign = 'right';
  for (var i = 0; i <= steps; i++) {
    var y = padT + h - (i / steps) * h;
    var val = Math.round(yMin + (i / steps) * (yMax - yMin));
    ctx.fillText(val, padL - 8, y + 4);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1f2937';
  ctx.fillText('前区和值走势', padL, 20);
}

function renderDLTSpanChart(spans) {
  var H = 260;
  var chart = createChartCanvas('chart-dlt-span', H);
  if (!chart) return;
  var ctx = chart.ctx, W = chart.width;
  var padL = 50, padR = 20, padT = 30, padB = 40;
  var w = W - padL - padR, h = H - padT - padB;
  var n = spans.length;
  var minS = Math.min.apply(null, spans);
  var maxS = Math.max.apply(null, spans);
  var range = maxS - minS || 1;
  var yMin = Math.max(0, minS - range * 0.2);
  var yMax = maxS + range * 0.2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  var steps = 5;
  for (var i = 0; i <= steps; i++) {
    var y = padT + h - (i / steps) * h;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var x = padL + (i / (n - 1 || 1)) * w;
    var y = padT + h - ((spans[n - 1 - i] - yMin) / (yMax - yMin)) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  for (var i = 0; i < n; i++) {
    var x = padL + (i / (n - 1 || 1)) * w;
    var y = padT + h - ((spans[n - 1 - i] - yMin) / (yMax - yMin)) * h;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#6b7280';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  var xStep = Math.max(1, Math.floor(n / 6));
  for (var i = 0; i < n; i += xStep) {
    var x = padL + (i / (n - 1 || 1)) * w;
    ctx.fillText((n - i) + '期前', x, H - 10);
  }

  ctx.textAlign = 'right';
  for (var i = 0; i <= steps; i++) {
    var y = padT + h - (i / steps) * h;
    var val = Math.round(yMin + (i / steps) * (yMax - yMin));
    ctx.fillText(val, padL - 8, y + 4);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1f2937';
  ctx.fillText('前区跨度走势', padL, 20);
}

function renderDLTFreqChart(freqMap, expected) {
  var H = 300;
  var chart = createChartCanvas('chart-dlt-freq', H);
  if (!chart) return;
  var ctx = chart.ctx, W = chart.width;
  var padL = 40, padR = 20, padT = 30, padB = 50;
  var w = W - padL - padR, h = H - padT - padB;
  var n = 35;
  var maxF = 0;
  for (var i = 1; i <= 35; i++) if (freqMap[i] > maxF) maxF = freqMap[i];
  var yMax = Math.max(maxF, expected * 1.5) + 1;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  var steps = 5;
  for (var i = 0; i <= steps; i++) {
    var y = padT + h - (i / steps) * h;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + w, y);
    ctx.stroke();
  }

  var expY = padT + h - (expected / yMax) * h;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1;
  if (ctx.setLineDash) {
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padL, expY);
    ctx.lineTo(padL + w, expY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  var barW = w / n * 0.7;
  for (var i = 1; i <= n; i++) {
    var x = padL + (i - 0.5) * (w / n);
    var bh = (freqMap[i] / yMax) * h;
    ctx.fillStyle = freqMap[i] >= expected * 1.3 ? '#ef4444' : (freqMap[i] <= expected * 0.7 ? '#3b82f6' : '#9ca3af');
    ctx.fillRect(x - barW / 2, padT + h - bh, barW, bh);
  }

  ctx.fillStyle = '#6b7280';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  for (var i = 1; i <= n; i += 2) {
    var x = padL + (i - 0.5) * (w / n);
    ctx.fillText(String(i).padStart(2, '0'), x, H - 15);
  }

  ctx.textAlign = 'right';
  for (var i = 0; i <= steps; i++) {
    var y = padT + h - (i / steps) * h;
    var val = Math.round((i / steps) * yMax);
    ctx.fillText(val, padL - 6, y + 3);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(padL, 8, 12, 12);
  ctx.fillStyle = '#1f2937';
  ctx.fillText('热号(>' + (expected * 1.3).toFixed(1) + ')', padL + 18, 18);
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(padL + 100, 8, 12, 12);
  ctx.fillStyle = '#1f2937';
  ctx.fillText('温号', padL + 118, 18);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(padL + 170, 8, 12, 12);
  ctx.fillStyle = '#1f2937';
  ctx.fillText('冷号(<' + (expected * 0.7).toFixed(1) + ')', padL + 188, 18);
  if (ctx.setLineDash) {
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(padL + 270, 14);
    ctx.lineTo(padL + 290, 14);
    ctx.stroke();
  }
  ctx.fillStyle = '#1f2937';
  ctx.fillText('期望值(' + expected.toFixed(1) + ')', padL + 298, 18);
}

function renderDLTDanTuo(last, allFronts, allBacks) {
  var history = allFronts.map(function(f,i){ return f.concat(allBacks[i]); });
  var lastDraw = last.front.concat(last.back);

  function makeReasons(s) {
    var reasons = [];
    if (s.wf > 0.2) reasons.push('高频');
    if (s.mp > 0.8) reasons.push('深冷');
    if (s.mkScore > 0.8) reasons.push('冷转热');
    if (s.neighborScore > 0.5) reasons.push('邻号');
    if (s.coScore > 0.5) reasons.push('共现强');
    return reasons;
  }
  function makeBackReasons(s) {
    var reasons = [];
    if (s.wf > 0.15) reasons.push('高频');
    if (s.mp > 0.8) reasons.push('深冷');
    if (s.mkScore > 0.8) reasons.push('冷转热');
    return reasons;
  }

  // Score each front number
  var scores = scoreDLTNumbers_V3(lastDraw, history);
  scores.sort(function(a, b) { return b.totalScore - a.totalScore; });

  var danCandidates = scores.slice(0, 4);
  var tuoCandidates = scores.slice(4, 14);

  // Back area scoring
  var backScores = scoreDLTBlueNumbers_V3(lastDraw, history);
  backScores.sort(function(a, b) { return b.totalScore - a.totalScore; });

  var html = '<div class="dantuo-section">';
  html += '<div class="dantuo-grid">';

  // Front area dan/tuo
  html += '<div class="dantuo-col">';
  html += '<h4><span class="dot" style="background:var(--accent3)"></span> 前区胆码推荐（' + danCandidates.length + '个）</h4>';
  html += '<div class="ball-row">';
  for (var i = 0; i < danCandidates.length; i++) {
    var c = danCandidates[i];
    html += '<div class="ball green tooltip" data-tip="评分:' + (c.totalScore*100).toFixed(1) + '">' + pad(c.num) + '</div>';
  }
  html += '</div>';
  html += '<div style="margin-top:0.75rem">';
  for (var i = 0; i < danCandidates.length; i++) {
    var c = danCandidates[i];
    html += '<div style="margin-bottom:0.5rem;font-size:0.82rem">';
    html += '<span class="hl-green">' + pad(c.num) + '</span> ';
    html += '<span style="color:var(--muted)">评分 ' + (c.totalScore*100).toFixed(1) + '</span> ';
    html += makeReasons(c).map(function(r) { return '<span class="reason-tag">' + r + '</span>'; }).join('');
    html += '</div>';
  }
  html += '</div>';

  html += '<h4 style="margin-top:1rem"><span class="dot" style="background:var(--accent5)"></span> 前区拖码推荐（' + tuoCandidates.length + '个）</h4>';
  html += '<div class="ball-row">';
  for (var i = 0; i < tuoCandidates.length; i++) {
    html += '<div class="ball purple tooltip" data-tip="评分:' + (tuoCandidates[i].totalScore*100).toFixed(1) + '">' + pad(tuoCandidates[i].num) + '</div>';
  }
  html += '</div>';
  html += '</div>';

  // Back area dan/tuo
  html += '<div class="dantuo-col">';
  html += '<h4><span class="dot" style="background:var(--accent3)"></span> 后区胆码推荐（1-2个）</h4>';
  html += '<div class="ball-row">';
  var backDan = backScores.slice(0, 2);
  for (var i = 0; i < backDan.length; i++) {
    html += '<div class="ball green tooltip" data-tip="评分:' + (backDan[i].totalScore*100).toFixed(1) + '">' + pad(backDan[i].num) + '</div>';
  }
  html += '</div>';
  html += '<div style="margin-top:0.75rem">';
  for (var i = 0; i < backDan.length; i++) {
    html += '<div style="margin-bottom:0.5rem;font-size:0.82rem">';
    html += '<span class="hl-green">' + pad(backDan[i].num) + '</span> ';
    html += '<span style="color:var(--muted)">评分 ' + (backDan[i].totalScore*100).toFixed(1) + '</span> ';
    html += makeBackReasons(backDan[i]).map(function(r) { return '<span class="reason-tag">' + r + '</span>'; }).join('');
    html += '</div>';
  }
  html += '</div>';

  html += '<h4 style="margin-top:1rem"><span class="dot" style="background:var(--accent5)"></span> 后区拖码推荐</h4>';
  html += '<div class="ball-row">';
  var backTuo = backScores.slice(2, 6);
  for (var i = 0; i < backTuo.length; i++) {
    html += '<div class="ball purple tooltip" data-tip="评分:' + (backTuo[i].totalScore*100).toFixed(1) + '">' + pad(backTuo[i].num) + '</div>';
  }
  html += '</div>';
  html += '</div>';

  html += '</div></div>';

  document.getElementById('dlt-dantuo').innerHTML = html;
}

// ========== V3 Helper Functions ==========
function weightedFreq(num, history, halfLife) {
  var lambda = Math.log(2) / (halfLife || 10);
  var score = 0, totalWeight = 0;
  for (var i = 0; i < history.length; i++) {
    var w = Math.exp(-lambda * i);
    if (history[i].indexOf(num) >= 0) score += w;
    totalWeight += w;
  }
  return totalWeight ? score / totalWeight : 0;
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
  var dist = getMissDistribution(num, history);
  if (!dist.gaps.length) return 0.5;
  var idx = dist.gaps.filter(function(g){return g < dist.currentGap;}).length;
  return idx / dist.gaps.length;
}
function buildCoOccurrence(history) {
  var co = {};
  for (var n = 1; n <= 35; n++) co[n] = {};
  for (var i = 0; i < history.length; i++) {
    var row = history[i];
    for (var a = 0; a < row.length; a++) {
      for (var b = a+1; b < row.length; b++) {
        var x = row[a], y = row[b];
        if (!co[x][y]) co[x][y] = 0;
        if (!co[y][x]) co[y][x] = 0;
        co[x][y]++; co[y][x]++;
      }
    }
  }
  return co;
}
function markovProb(num, history) {
  var aa = 0, ab = 0, ba = 0, bb = 0;
  for (var i = 1; i < history.length; i++) {
    var prev = history[i-1].indexOf(num) >= 0;
    var curr = history[i].indexOf(num) >= 0;
    if (prev && curr) aa++;
    else if (prev && !curr) ab++;
    else if (!prev && curr) ba++;
    else bb++;
  }
  var pAtoA = (aa+ab) ? aa/(aa+ab) : 0;
  var pBtoA = (ba+bb) ? ba/(ba+bb) : 0;
  var pAtoB = (aa+ab) ? ab/(aa+ab) : 0;
  return {aa:aa, ab:ab, ba:ba, bb:bb, pAtoA:pAtoA, pBtoA:pBtoA, pAtoB:pAtoB};
}
function tailStats(history) {
  var tails = [0,0,0,0,0,0,0,0,0,0];
  history.forEach(function(row){ row.forEach(function(n){ tails[n%10]++; }); });
  var total = tails.reduce(function(a,b){return a+b;},0) || 1;
  return tails.map(function(t){ return t/total; });
}
function gapStats(row) {
  var sorted = row.slice().sort(function(a,b){return a-b;});
  var totalGap = 0, maxGap = 0, pairs = [];
  for (var i = 1; i < sorted.length; i++) {
    var g = sorted[i]-sorted[i-1];
    totalGap += g;
    maxGap = Math.max(maxGap, g);
    if (g === 1) pairs.push([sorted[i-1], sorted[i]]);
  }
  return {totalGap: totalGap, maxGap: maxGap, pairs: pairs, avgGap: totalGap/(sorted.length-1)};
}

// 计算每个号码作为连号一部分的历史频率（连号评分）
function pairHistoryScore(num, history) {
  var pairCount = 0, total = 0;
  for (var i = 0; i < history.length; i++) {
    var row = history[i];
    if (row.indexOf(num) >= 0) {
      total++;
      // 检查该号码是否与同组其他号码形成连号
      for (var j = 0; j < row.length; j++) {
        if (Math.abs(row[j] - num) === 1) { pairCount++; break; }
      }
    }
  }
  return total ? pairCount / total : 0;
}

// 计算后区同尾组合的历史频率
function backTailPairScore(num, history) {
  var tailCount = 0, total = 0;
  for (var i = 0; i < history.length; i++) {
    var row = history[i];
    if (row.length >= 2) {
      total++;
      var tail = num % 10;
      var sameTail = row.filter(function(n){ return n % 10 === tail; });
      if (sameTail.length >= 2) tailCount++;
    }
  }
  return total ? tailCount / total : 0;
}
// ========== V3 Helper Functions End ==========

function scoreDLTNumbers_V3(lastDraw, history) {
  var fronts = history.map(function(h){ return h.slice(0,5); });
  var co = buildCoOccurrence(fronts);
  var last = lastDraw.slice(0,5);
  var scores = [];

  // 近5期区间均值偏移计算
  var recentN = Math.min(5, fronts.length);
  var recentZoneCounts = [0, 0, 0];
  var allZoneCounts = [0, 0, 0];
  for (var i = 0; i < fronts.length; i++) {
    for (var j = 0; j < fronts[i].length; j++) {
      var zn = fronts[i][j] <= 12 ? 0 : fronts[i][j] <= 23 ? 1 : 2;
      allZoneCounts[zn]++;
      if (i < recentN) recentZoneCounts[zn]++;
    }
  }
  var zoneAvgAll = allZoneCounts.map(function(c){ return c / fronts.length; });
  var zoneAvgRecent = recentZoneCounts.map(function(c){ return c / recentN; });

  // 上期尾数频次（用于尾数偏态回补）
  var lastTailFreq = {};
  last.forEach(function(x){ lastTailFreq[x%10] = (lastTailFreq[x%10]||0) + 1; });

  for (var n = 1; n <= 35; n++) {
    var wf = weightedFreq(n, fronts, 8);
    var dist = getMissDistribution(n, fronts);
    var currentGap = dist.currentGap;
    var mp = getMissPercentile(n, fronts);
    var mk = markovProb(n, fronts);
    var mpScore = mp > 0.85 ? 1.0 : (mp > 0.7 ? 0.8 : (mp > 0.5 ? 0.6 : 0.3));
    var mkScore = mk.pBtoA > mk.pAtoA ? 0.9 : (mk.pBtoA > 0.3 ? 0.7 : 0.4);
    var tail = n % 10;
    var tailScore = 1 - Math.abs(tailStats(fronts)[tail] - 0.1) * 5;
    // 尾数偏态回补：上期某尾数出现>=2次则该尾数降分，=0次则加分
    if (lastTailFreq[tail] >= 2) tailScore -= 0.12;
    else if (!lastTailFreq[tail]) tailScore += 0.08;

    var isOdd = n % 2 === 1;
    var oddRatio = last.filter(function(x){return x%2===1;}).length / 5;
    var oddAltScore;
    if (oddRatio >= 0.8) {
      oddAltScore = isOdd ? 0.3 : 0.95;
    } else if (oddRatio <= 0.2) {
      oddAltScore = isOdd ? 0.95 : 0.3;
    } else {
      oddAltScore = (isOdd && oddRatio <= 0.6) || (!isOdd && oddRatio >= 0.4) ? 0.8 : 0.5;
    }
    var sizeScore = (n <= 17 && last.filter(function(x){return x<=17;}).length <= 3) || (n > 17 && last.filter(function(x){return x>17;}).length <= 3) ? 0.8 : 0.5;

    // 区间评分增强：结合近5期均值偏移
    var zoneIdx = n <= 12 ? 0 : n <= 23 ? 1 : 2;
    var zoneScore = ((n<=12 && last.filter(function(x){return x<=12;}).length<=2) || (n>12&&n<=23 && last.filter(function(x){return x>12&&x<=23;}).length<=2) || (n>23 && last.filter(function(x){return x>23;}).length<=2)) ? 0.8 : 0.5;
    var zoneShift = zoneAvgRecent[zoneIdx] - zoneAvgAll[zoneIdx];
    if (zoneShift <= -0.3) zoneScore += 0.12; // 近期偏少，回补预期
    else if (zoneShift >= 0.3) zoneScore -= 0.08; // 近期偏多，降温

    // 斜连号评分：与上期号码差2或差3
    var diagonalScore = 0;
    for (var di = 0; di < last.length; di++) {
      var diff = Math.abs(n - last[di]);
      if (diff === 2) { diagonalScore = 0.75; break; }
      else if (diff === 3) { diagonalScore = 0.55; break; }
    }

    // neighborScore 优化：结合上期邻号判断 + 该号码作为连号一部分的历史频率
    var hasNeighbor = last.some(function(x){ return Math.abs(x-n)<=1 && x!==n; });
    var pairScore = pairHistoryScore(n, fronts);
    var neighborScore = hasNeighbor ? (0.6 + pairScore * 0.4) : (0.2 + pairScore * 0.2);
    var stability = 1 - Math.abs(wf - 0.15) * 3;

    // 冷热交替评分：连续出现期数或连续遗漏期数
    var hotColdAltScore = 0.5;
    var consecutiveAppear = 0, consecutiveMiss = 0;
    for (var ci = 0; ci < fronts.length; ci++) {
      if (fronts[ci].indexOf(n) >= 0) {
        if (consecutiveMiss > 0) break;
        consecutiveAppear++;
      } else {
        if (consecutiveAppear > 0) break;
        consecutiveMiss++;
      }
    }
    if (consecutiveAppear >= 2) hotColdAltScore = 0.3; // 连出2期+，降温
    else if (consecutiveMiss >= 5) hotColdAltScore = 0.9; // 遗漏5期+，强烈回补
    else if (consecutiveMiss >= 3) hotColdAltScore = 0.75; // 遗漏3-4期，回补

    scores.push({
      num: n,
      wf: wf, currentGap: currentGap, mp: mp, mpScore: mpScore, mkScore: mkScore,
      tailScore: tailScore, oddAltScore: oddAltScore, sizeScore: sizeScore, zoneScore: zoneScore,
      neighborScore: neighborScore, pairScore: pairScore, stability: stability,
      diagonalScore: diagonalScore, hotColdAltScore: hotColdAltScore,
      baseScore: wf*0.15 + mpScore*0.16 + tailScore*0.08 + oddAltScore*0.04 + sizeScore*0.03 + zoneScore*0.04 + neighborScore*0.04 + pairScore*0.05 + stability*0.04 + mkScore*0.11 + diagonalScore*0.05 + hotColdAltScore*0.06,
      coScore: 0
    });
  }
  var top10 = scores.slice().sort(function(a,b){return b.baseScore-a.baseScore;}).slice(0,10).map(function(s){return s.num;});
  scores.forEach(function(s){
    var coSum = 0, coCount = 0;
    top10.forEach(function(t){
      if (t !== s.num && co[s.num] && co[s.num][t]) { coSum += co[s.num][t]; coCount++; }
    });
    s.coScore = coCount ? Math.min(coSum/coCount/3, 1) : 0;
    s.totalScore = s.baseScore + s.coScore * 0.15;
  });
  return scores.sort(function(a,b){return b.totalScore-a.totalScore;});
}

function scoreDLTBlueNumbers_V3(lastDraw, history) {
  var backs = history.map(function(h){ return h.slice(5); });
  var lastB = lastDraw.slice(5);
  var scores = [];

  // 后区连号概率统计
  var consecutiveCount = 0, consecutiveTotal = 0;
  for (var ci = 0; ci < backs.length; ci++) {
    var b = backs[ci].sort(function(a,b){return a-b;});
    if (Math.abs(b[0]-b[1]) === 1) { consecutiveCount++; }
    consecutiveTotal++;
  }
  var consecutiveProb = consecutiveTotal > 0 ? consecutiveCount / consecutiveTotal : 0.2;

  // 后区和值历史统计
  var backSums = backs.map(function(b){ return b[0]+b[1]; });
  var avgBackSum = backSums.reduce(function(a,b){return a+b;},0) / (backSums.length||1);
  var lastBackSum = lastB[0] + lastB[1];

  // 后区奇偶比历史统计
  var oddHistory = backs.map(function(b){ return b.filter(function(x){return x%2===1;}).length; });
  var avgOddBack = oddHistory.reduce(function(a,b){return a+b;},0) / (oddHistory.length||1);

  for (var n = 1; n <= 12; n++) {
    var wf = weightedFreq(n, backs, 6);
    var dist = getMissDistribution(n, backs);
    var currentGap = dist.currentGap;
    var mp = getMissPercentile(n, backs);
    var mpScore = mp > 0.85 ? 1.0 : (mp > 0.7 ? 0.8 : (mp > 0.5 ? 0.6 : 0.3));
    var mk = markovProb(n, backs);
    var mkScore = mk.pBtoA > mk.pAtoA ? 0.9 : (mk.pBtoA > 0.3 ? 0.7 : 0.4);

    // 奇偶评分增强：结合历史奇偶比均值
    var lastOddCount = lastB.filter(function(x){return x%2===1;}).length;
    var oddScore;
    if (lastOddCount === 2) {
      // 上期全奇，下期倾向偶数
      oddScore = n%2===0 ? 0.9 : 0.4;
    } else if (lastOddCount === 0) {
      // 上期全偶，下期倾向奇数
      oddScore = n%2===1 ? 0.9 : 0.4;
    } else {
      oddScore = (n%2===1 && lastOddCount<=1) || (n%2===0 && lastOddCount>=1) ? 0.8 : 0.55;
    }
    // 历史奇偶比回归：历史均值偏离1.0较大时强化回归
    if (avgOddBack >= 1.3 && n%2===0) oddScore += 0.08;
    else if (avgOddBack <= 0.7 && n%2===1) oddScore += 0.08;

    var sizeScore = (n<=6 && lastB.filter(function(x){return x<=6;}).length<=1) || (n>6 && lastB.filter(function(x){return x>6;}).length<=1) ? 0.85 : 0.5;
    // 同尾组合评分：该尾数在历史上作为后区同尾出现的频率
    var tailScore = backTailPairScore(n, backs);

    // 连号评分：若历史连号概率高且n与上期某号差1则加分
    var consecutiveScore = 0;
    if (consecutiveProb > 0.25) {
      for (var cj = 0; cj < lastB.length; cj++) {
        if (Math.abs(n - lastB[cj]) === 1) { consecutiveScore = 0.7; break; }
      }
    }

    // 和值趋势评分：若n参与的组合和值接近历史均值则加分
    var sumTrendScore = 0.5;
    for (var sj = 0; sj < lastB.length; sj++) {
      var pairSum = n + lastB[sj];
      if (Math.abs(pairSum - avgBackSum) <= 3) { sumTrendScore = 0.8; break; }
    }
    // 上期和值偏态回补
    if (Math.abs(lastBackSum - avgBackSum) > 5) {
      for (var sk = 0; sk < lastB.length; sk++) {
        var ps = n + lastB[sk];
        if ((lastBackSum > avgBackSum && ps < avgBackSum) || (lastBackSum < avgBackSum && ps > avgBackSum)) {
          sumTrendScore += 0.1;
          break;
        }
      }
    }

    scores.push({num: n, wf: wf, currentGap: currentGap, mp: mp, mpScore: mpScore, mkScore: mkScore, oddScore: oddScore, sizeScore: sizeScore, tailScore: tailScore, consecutiveScore: consecutiveScore, sumTrendScore: sumTrendScore, totalScore: wf*0.20 + mpScore*0.16 + oddScore*0.08 + sizeScore*0.06 + tailScore*0.07 + mkScore*0.09 + consecutiveScore*0.05 + sumTrendScore*0.04});
  }
  return scores.sort(function(a,b){return b.totalScore-a.totalScore;});
}

function renderDLTRecommend_V3(lastDraw, allFronts, allBacks) {
  var last = lastDraw;
  var history = allFronts.map(function(f,i){ return f.concat(allBacks[i]); });
  var frontScores = scoreDLTNumbers_V3(last, history);
  var backScores = scoreDLTBlueNumbers_V3(last, history);
  var topFronts = frontScores.slice(0,10);
  var topBacks = backScores.slice(0,5);

  // Build fast lookup maps
  var frontScoreMap = {};
  frontScores.forEach(function(s){ frontScoreMap[s.num] = s; });
  var backScoreMap = {};
  backScores.forEach(function(s){ backScoreMap[s.num] = s; });

  // 上期前区/后区号码，用于回归分析
  var lastFront = last.slice(0, 5);
  var lastBack = last.slice(5);
  var lastOddRatio = lastFront.filter(function(x){return x%2===1;}).length / 5;
  var lastBigRatio = lastFront.filter(function(x){return x>17;}).length / 5;
  var lastHasPair = gapStats(lastFront.slice().sort(function(a,b){return a-b;})).pairs.length >= 1;
  var lastBackSameTail = lastBack.length >= 2 && (lastBack[0] % 10) === (lastBack[1] % 10);

  function qualityScore(front, back) {
    var s = front.slice().sort(function(a,b){return a-b;});
    var sum = s.reduce(function(a,b){return a+b;},0);
    var span = s[4]-s[0];
    var z1=s.filter(function(x){return x<=12;}).length, z2=s.filter(function(x){return x>12&&x<=23;}).length, z3=s.filter(function(x){return x>23;}).length;
    var odd=s.filter(function(x){return x%2===1;}).length;
    var big=s.filter(function(x){return x>17;}).length;
    var tails = {}; s.forEach(function(n){var t=n%10; tails[t]=(tails[t]||0)+1;});
    var maxTail = Math.max.apply(null, Object.values(tails));
    var g = gapStats(s);
    var q = 40;
    if (sum>=60 && sum<=130) q+=12; else if (sum>=50 && sum<=140) q+=6;
    if (span>=10 && span<=28) q+=12; else if (span>=8 && span<=32) q+=6;
    if ((z1>=1&&z1<=3)&&(z2>=1&&z2<=3)&&(z3>=1&&z3<=3)) q+=15;
    else if ((z1>=1&&z1<=3)&&(z2>=1&&z2<=3)) q+=8;
    if (odd>=2 && odd<=3) q+=10; else if (odd>=1 && odd<=4) q+=5;
    if (big>=2 && big<=3) q+=10; else if (big>=1 && big<=4) q+=5;
    if (maxTail<=2) q+=12; else if (maxTail<=3) q+=6;
    if (g.pairs.length===1) q+=12; else if (g.pairs.length===2) q+=6;
    if (g.maxGap<=12) q+=8; else if (g.maxGap<=15) q+=4;
    // 前区同尾加分：最多一对同尾是较优形态
    var sameTailPairs = 0;
    var tailSeen = {};
    s.forEach(function(n){ var t=n%10; if(tailSeen[t]) sameTailPairs++; else tailSeen[t]=true; });
    if (sameTailPairs===1) q+=5;

    // AC值分析（号码离散度）：AC值越大号码分布越分散
    var acValue = 0;
    var diffs = [];
    for (var ai=0; ai<s.length-1; ai++) {
      for (var aj=ai+1; aj<s.length; aj++) {
        diffs.push(s[aj]-s[ai]);
      }
    }
    var uniqueDiffs = {};
    diffs.forEach(function(d){ uniqueDiffs[d]=true; });
    acValue = Object.keys(uniqueDiffs).length;
    if (acValue>=8) q+=8; else if (acValue>=6) q+=4;

    // 斜连号质量分：与上期号码差2/3的个数
    var diagonalCount = 0;
    for (var di=0; di<s.length; di++) {
      for (var dj=0; dj<lastFront.length; dj++) {
        var diff = Math.abs(s[di]-lastFront[dj]);
        if (diff===2 || diff===3) { diagonalCount++; break; }
      }
    }
    if (diagonalCount>=2) q+=5; else if (diagonalCount>=1) q+=3;

    // ========== 基于上期特征的动态回归调整 ==========
    // 1. 奇偶回归：上期极端则下期强烈反向回归
    if ((lastOddRatio >= 0.8 && odd <= 2) || (lastOddRatio <= 0.2 && odd >= 3)) q += 4;
    else if ((lastOddRatio >= 0.6 && odd <= 2) || (lastOddRatio <= 0.4 && odd >= 3)) q += 2;
    // 2. 大小回归：上期极端则下期反向回归
    if ((lastBigRatio >= 0.8 && big <= 2) || (lastBigRatio <= 0.2 && big >= 3)) q += 4;
    else if ((lastBigRatio >= 0.6 && big <= 2) || (lastBigRatio <= 0.4 && big >= 3)) q += 2;
    // 3. 连号延续：上期有连号则下期有连号适当加分（连号有一定惯性）
    if (lastHasPair && g.pairs.length >= 1) q += 3;
    // 4. 后区同尾避免：上期后区同尾则下期优先不同尾
    if (lastBackSameTail) {
      var backTailSame = (back[0] % 10) === (back[1] % 10);
      if (!backTailSame) q += 5;
    }
    // 5. 区间均值偏移回补：上期某区间偏多则下期该区间偏少加分
    var lastZ1 = lastFront.filter(function(x){return x<=12;}).length;
    var lastZ2 = lastFront.filter(function(x){return x>12&&x<=23;}).length;
    var lastZ3 = lastFront.filter(function(x){return x>23;}).length;
    if (lastZ1 >= 3 && z1 <= 2) q += 3;
    if (lastZ2 >= 3 && z2 <= 2) q += 3;
    if (lastZ3 >= 3 && z3 <= 2) q += 3;

    var fScore = s.reduce(function(sum,n){var sc=frontScoreMap[n]; return sum+(sc?sc.totalScore:0);},0);
    var bScore = back.reduce(function(sum,n){var sc=backScoreMap[n]; return sum+(sc?sc.totalScore:0);},0);
    q += Math.min(fScore*5, 20) + Math.min(bScore*8, 12);
    return Math.min(100, Math.round(q));
  }

  function genStrategy1() {
    var picks = frontScores.slice(0,12).map(function(s){return s.num;});
    var bp = backScores.slice(0,4).map(function(s){return s.num;});
    var best = null, bestQ = -1;
    for (var a=0;a<picks.length-4;a++)
    for (var b=a+1;b<picks.length-3;b++)
    for (var c=b+1;c<picks.length-2;c++)
    for (var d=c+1;d<picks.length-1;d++)
    for (var e=d+1;e<picks.length;e++) {
      var f=[picks[a],picks[b],picks[c],picks[d],picks[e]];
      for (var i=0;i<bp.length-1;i++)
      for (var j=i+1;j<bp.length;j++) {
        var b=[bp[i],bp[j]];
        var q = qualityScore(f,b);
        if (q>bestQ) {bestQ=q; best=f.concat(b);}
      }
    }
    return best ? [best] : [];
  }

  function genStrategy2() {
    // 强制引入至少1个冷号，与策略1形成差异
    var hot = frontScores.slice(0,8).map(function(s){return s.num;});
    var cold = frontScores.filter(function(s){return s.mp>0.6;}).map(function(s){return s.num;});
    var unique = [];
    // 先取4个热号
    for (var i=0;i<hot.length && unique.length<4;i++) {
      if (unique.indexOf(hot[i])<0) unique.push(hot[i]);
    }
    // 强制加入1个冷号
    for (var i=0;i<cold.length && unique.length<5;i++) {
      if (unique.indexOf(cold[i])<0) unique.push(cold[i]);
    }
    // 补足到5个
    for (var i=0;i<frontScores.length && unique.length<5;i++) {
      if (unique.indexOf(frontScores[i].num)<0) unique.push(frontScores[i].num);
    }
    unique.sort(function(a,b){return a-b;});
    var b = [backScores[0].num, backScores[Math.min(2,backScores.length-1)].num];
    return [unique.concat(b)];
  }

  function genStrategy3() {
    // 马尔可夫转移驱动：优先选mkScore高的号码
    var mkPool = frontScores.filter(function(s){return s.mkScore>0.5;}).slice(0,10).map(function(s){return s.num;});
    if (mkPool.length < 5) {
      for (var i=0;i<frontScores.length && mkPool.length<5;i++) {
        if (mkPool.indexOf(frontScores[i].num)<0) mkPool.push(frontScores[i].num);
      }
    }
    var pool = mkPool.slice(0,12);
    var best = null, bestQ = -1;
    for (var a=0;a<pool.length-4;a++)
    for (var b=a+1;b<pool.length-3;b++)
    for (var c=b+1;c<pool.length-2;c++)
    for (var d=c+1;d<pool.length-1;d++)
    for (var e=d+1;e<pool.length;e++) {
      var f=[pool[a],pool[b],pool[c],pool[d],pool[e]];
      var b2 = [backScores[1].num, backScores[Math.min(2,backScores.length-1)].num];
      var q = qualityScore(f,b2);
      if (q>bestQ) {bestQ=q; best=f.concat(b2);}
    }
    return best ? [best] : [];
  }

  function genStrategy4() {
    var cluster = [frontScores[0].num];
    var co = buildCoOccurrence(allFronts);
    while (cluster.length<5) {
      var bestN=-1, bestS=-1;
      for (var n=1;n<=35;n++) {
        if (cluster.indexOf(n)>=0) continue;
        var s=0;
        cluster.forEach(function(c){s+= (co[n]&&co[n][c])||0;});
        if (s>bestS) {bestS=s; bestN=n;}
      }
      if (bestN>0) cluster.push(bestN); else break;
    }
    while (cluster.length<5) {
      var found = false;
      for (var i=0;i<frontScores.length;i++) {
        if (cluster.indexOf(frontScores[i].num)<0) {
          cluster.push(frontScores[i].num);
          found = true;
          break;
        }
      }
      if (!found) break;
    }
    var b = [backScores[0].num, backScores[Math.min(3,backScores.length-1)].num];
    return [cluster.slice(0,5).concat(b)];
  }

  function combosEqual(c1, c2) {
    if (!c1 || !c2 || c1.length !== c2.length) return false;
    var f1 = c1.slice(0,5).sort(function(a,b){return a-b;});
    var f2 = c2.slice(0,5).sort(function(a,b){return a-b;});
    var b1 = c1.slice(5).sort(function(a,b){return a-b;});
    var b2 = c2.slice(5).sort(function(a,b){return a-b;});
    for (var i=0;i<5;i++) if (f1[i] !== f2[i]) return false;
    for (var i=0;i<b1.length;i++) if (b1[i] !== b2[i]) return false;
    return true;
  }

  function makeDistinct(baseCombo, existing) {
    var front = baseCombo.slice(0,5);
    var back = baseCombo.slice(5);
    // 尝试替换前区中评分最低的号码
    var sortedFront = front.slice().sort(function(a,b){
      return (frontScoreMap[a]?frontScoreMap[a].totalScore:0) - (frontScoreMap[b]?frontScoreMap[b].totalScore:0);
    });
    for (var idx=0;idx<sortedFront.length;idx++) {
      for (var j=0;j<frontScores.length;j++) {
        var cand = frontScores[j].num;
        if (front.indexOf(cand) >= 0) continue;
        var newFront = front.slice();
        var replaceIdx = -1;
        for (var ri=0;ri<newFront.length;ri++) {
          if (newFront[ri] === sortedFront[idx]) {replaceIdx=ri; break;}
        }
        if (replaceIdx < 0) continue;
        newFront[replaceIdx] = cand;
        newFront.sort(function(a,b){return a-b;});
        var newCombo = newFront.concat(back);
        var dup = false;
        for (var k=0;k<existing.length;k++) if (combosEqual(newCombo, existing[k])) {dup=true; break;}
        if (!dup) return newCombo;
      }
    }
    // 尝试调整后区
    for (var j=2;j<backScores.length;j++) {
      var newBack = [backScores[0].num, backScores[j].num];
      var newCombo = front.concat(newBack);
      var dup = false;
      for (var k=0;k<existing.length;k++) if (combosEqual(newCombo, existing[k])) {dup=true; break;}
      if (!dup) return newCombo;
    }
    return baseCombo;
  }

  // 策略5：区间偏移驱动
  function genStrategy5() {
    var zonePool = [[], [], []];
    for (var zi = 0; zi < frontScores.length; zi++) {
      var n = frontScores[zi].num;
      var idx = n <= 12 ? 0 : n <= 23 ? 1 : 2;
      zonePool[idx].push(n);
    }
    // 上期区间分布
    var lastZone = [0, 0, 0];
    lastFront.forEach(function(x){ lastZone[x<=12?0:x<=23?1:2]++; });
    // 优先从近期偏少的区间选取
    var zoneOrder = [0, 1, 2].sort(function(a,b){ return lastZone[a] - lastZone[b]; });
    var picks = [];
    // 每个区间至少选1个，优先从偏少区间多选
    for (var zi = 0; zi < 3; zi++) {
      var zidx = zoneOrder[zi];
      var need = zi === 0 ? 2 : zi === 1 ? 2 : 1;
      for (var pj = 0; pj < zonePool[zidx].length && picks.length < 5; pj++) {
        if (picks.indexOf(zonePool[zidx][pj]) < 0) {
          picks.push(zonePool[zidx][pj]);
          need--;
          if (need <= 0) break;
        }
      }
    }
    // 补足到5个
    for (var fi = 0; fi < frontScores.length && picks.length < 5; fi++) {
      if (picks.indexOf(frontScores[fi].num) < 0) picks.push(frontScores[fi].num);
    }
    picks.sort(function(a,b){return a-b;});
    var b = [backScores[0].num, backScores[Math.min(2, backScores.length-1)].num];
    return [picks.concat(b)];
  }

  var s1 = genStrategy1();
  var s2 = genStrategy2();
  var s3 = genStrategy3();
  var s4 = genStrategy4();
  var s5 = genStrategy5();

  // 去重：确保五个策略的推荐不完全相同
  var allCombos = [];
  [s1, s2, s3, s4, s5].forEach(function(strat) {
    for (var i=0;i<strat.length;i++) {
      var dup = false;
      for (var j=0;j<allCombos.length;j++) {
        if (combosEqual(strat[i], allCombos[j])) {dup=true; break;}
      }
      if (dup) {
        strat[i] = makeDistinct(strat[i], allCombos);
      }
      allCombos.push(strat[i]);
    }
  });

  var html = '<div class="recommend-container" style="padding:12px"><h3 style="margin-top:0;color:var(--ink)">🎯 V3+ 增强模型推荐</h3>';
  html += '<p style="color:var(--muted);font-size:12px;margin-bottom:12px">基于加权频率·遗漏百分位·共现矩阵·马尔可夫转移·尾数分散·区间偏移·连号历史·邻号·奇偶回归·大小均衡·稳定性·斜连号·冷热交替·AC值 十四维评分体系（含上期特征动态回归）</p>';

  var strategies = [
    {name:'严格约束优化', desc:'在Top14热号中遍历所有组合，通过硬性约束（和值/跨度/区间/奇偶/大小/尾数/连号/AC值/斜连号）筛选最高分', combos:s1},
    {name:'热号+遗漏双轨', desc:'前3球从Top8热号抽取，后2球从遗漏百分位>70%的冷号补充', combos:s2},
    {name:'马尔可夫转移驱动', desc:'优先选择p(B→A) > p(A→A)的号码（冷转热概率高），辅以遗漏百分位', combos:s3},
    {name:'共现聚类', desc:'以Top1号码为种子，迭代添加共现概率最高的号码形成聚类', combos:s4},
    {name:'区间偏移回补', desc:'优先从近期偏少的区间选取号码，实现区间均值回归', combos:s5}
  ];

  strategies.forEach(function(st,i){
    html += '<div class="strategy-box" style="margin:12px 0;padding:12px;border:1px solid var(--rule);border-radius:8px;background:var(--bg2)">';
    html += '<h4 style="margin:0 0 6px 0;color:var(--ink)">策略'+(i+1)+'：'+st.name+'</h4>';
    html += '<p style="margin:0 0 8px 0;color:var(--muted);font-size:12px">'+st.desc+'</p>';
    st.combos.forEach(function(c,ci){
      var q = qualityScore(c.slice(0,5), c.slice(5));
      html += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap">';
      html += '<span style="font-weight:bold;color:var(--accent4)">方案'+(ci+1)+'：</span>';
      html += '<span style="color:var(--ink)">前区：'+c.slice(0,5).map(function(n){return String(n).padStart(2,'0');}).join(', ')+'</span>';
      html += '<span style="color:var(--ink)">后区：'+c.slice(5).map(function(n){return String(n).padStart(2,'0');}).join(', ')+'</span>';
      html += '<span style="margin-left:auto;background:'+(q>=85?'var(--accent3)':(q>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:12px">质量分 '+q+'</span>';
      html += '</div>';
    });
    html += '</div>';
  });

  html += '<h4 style="margin-top:16px;color:var(--ink)">📊 前区 Top10 号码评分详情</h4>';
  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--bg3)">';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">号码</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">加权频率</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">当前遗漏</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">遗漏%位</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">转移概率</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">共现分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">总评分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">理由</th>';
  html += '</tr></thead><tbody>';
  topFronts.forEach(function(s){
    var reason = [];
    if (s.wf > 0.2) reason.push('高频');
    if (s.mp > 0.8) reason.push('深冷');
    if (s.mkScore > 0.8) reason.push('冷转热');
    if (s.neighborScore > 0.5) reason.push('邻号');
    if (s.coScore > 0.5) reason.push('共现强');
    html += '<tr><td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--ink)">'+String(s.num).padStart(2,'0')+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.wf*100).toFixed(1)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+s.currentGap+'期</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mp*100).toFixed(0)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mkScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.coScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent4)">'+(s.totalScore*100).toFixed(1)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(reason.join('·')||'-')+'</td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<h4 style="margin-top:16px;color:var(--ink)">🔵 后区 Top5 号码评分</h4>';
  html += '<div style="display:flex;gap:12px;flex-wrap:wrap">';
  topBacks.forEach(function(s){
    html += '<div style="padding:8px 12px;border:1px solid var(--rule);border-radius:6px;background:var(--bg3)">';
    html += '<span style="font-weight:bold;color:var(--accent2);font-size:16px">'+String(s.num).padStart(2,'0')+'</span>';
    html += '<span style="color:var(--muted);font-size:11px;margin-left:8px">'+(s.totalScore*100).toFixed(1)+'分 (遗漏'+s.currentGap+'期)</span>';
    html += '</div>';
  });
  html += '</div>';
  html += '</div>';

  document.getElementById('dlt-recommend').innerHTML = html;
}


// ==================== 双色球分析 ====================

var SSQ_ZONES = [[1,11],[12,22],[23,33]];

var ssqSampleHistory = [
  '08,12,18,21,24,30|01',
  '03,06,08,14,26,27|08',
  '03,05,16,18,29,32|04',
  '04,19,27,29,30,32|13',
  '05,11,21,23,24,29|16',
  '07,08,16,24,30,32|02',
  '01,09,15,18,29,33|15',
  '02,08,25,28,30,31|02',
  '02,04,07,14,28,29|09',
  '01,04,05,15,23,28|07',
  '07,09,10,16,22,27|11',
  '08,16,26,28,29,30|15',
  '01,04,07,21,29,30|01',
  '01,10,22,24,28,30|07',
  '10,19,21,22,31,33|05',
  '04,11,24,25,32,33|13',
  '13,20,25,29,30,33|02',
  '01,02,03,08,13,14|02',
  '01,03,11,22,26,31|11',
  '09,14,15,16,29,30|10',
  '06,09,25,27,28,30|03',
  '03,04,14,15,18,20|02',
  '09,15,18,24,28,33|01',
  '07,16,21,24,27,30|07',
  '02,09,10,24,31,33|16',
  '04,11,15,17,24,30|15',
  '02,14,17,18,22,30|01',
  '06,09,14,16,25,32|16',
  '02,07,12,19,24,31|10',
  '02,08,10,17,19,24|13',
  '03,04,14,22,23,33|04'
];

function loadSSQSample() {
  var last = ssqSampleHistory[0];
  var parts = last.split('|');
  document.getElementById('ssq-red').value = parts[0];
  document.getElementById('ssq-blue').value = parts[1];
  document.getElementById('ssq-history').value = ssqSampleHistory.join('\n');
  // 填充复盘输入框默认值
  var sampleRed = parts[0].split(',').slice(0,6).join(',');
  document.getElementById('ssq-review-numbers').value = sampleRed;
  document.getElementById('ssq-review-blue').value = parts[1];
}

function clearSSQ() {
  document.getElementById('ssq-red').value = '';
  document.getElementById('ssq-blue').value = '';
  document.getElementById('ssq-history').value = '';
  document.getElementById('ssq-results').style.display = 'none';
  document.getElementById('ssq-empty').style.display = 'block';
}

function analyzeSSQ() {
  var redStr = document.getElementById('ssq-red').value;
  var blueStr = document.getElementById('ssq-blue').value;
  var historyStr = document.getElementById('ssq-history').value;

  var lastRed = parseNums(redStr);
  var lastBlue = parseNums(blueStr);

  var lines = historyStr.trim().split('\n').filter(function(l) { return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var r = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (r.length >= 6 && b.length >= 1) {
      history.push({ red: r.slice(0, 6).sort(function(a,b){return a-b}), blue: b[0] });
    }
  }

  if (history.length === 0 && lastRed.length >= 6 && lastBlue.length >= 1) {
    history.unshift({ red: lastRed.slice(0,6).sort(function(a,b){return a-b}), blue: lastBlue[0] });
  }

  if (history.length < 2) { alert('请至少输入2期历史数据'); return; }

  var last = history[0];
  var allReds = history.map(function(h) { return h.red; });
  var allBlues = history.map(function(h) { return h.blue; });

  document.getElementById('ssq-empty').style.display = 'none';
  document.getElementById('ssq-results').style.display = 'block';

  renderSSQStats(last, history);
  renderSSQRepeat(last, history);
  renderSSQZone(allReds);
  renderSSQSum(allReds);
  renderSSQSpan(allReds);
  renderSSQHotCold(allReds, allBlues);
  renderSSQBlueTrend(allBlues);
  renderSSQOddEven(allReds, allBlues);
  renderSSQBlueMiss(allBlues);
  renderSSQTail(allReds);
  renderSSQDanTuo(last, allReds, allBlues);
  renderSSQRecommend(last, allReds, allBlues);

  document.getElementById('ssq-results').scrollIntoView({ behavior: 'smooth' });
}

function renderSSQStats(last, history) {
  var redSum = sum(last.red);
  var redSpan = span(last.red);
  var oddCount = last.red.filter(function(n) { return n % 2 === 1; }).length;
  var bigCount = last.red.filter(function(n) { return n > 16; }).length;
  var sums = history.map(function(h) { return sum(h.red); });

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + redSum + '</div><div class="stat-label">上期红球和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + redSpan + '</div><div class="stat-label">上期红球跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + oddCount + ':' + (6 - oddCount) + '</div><div class="stat-label">奇偶比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + bigCount + ':' + (6 - bigCount) + '</div><div class="stat-label">大小比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">上期开奖号码</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < last.red.length; i++) {
    html += '<div class="ball red">' + pad(last.red[i]) + '</div>';
  }
  html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
  html += '<div class="ball blue">' + pad(last.blue) + '</div>';
  html += '</div></div>';

  document.getElementById('ssq-stats').innerHTML = html;
}

function renderSSQRepeat(last, history) {
  var html = '';
  var repeatCounts = [];
  for (var i = 1; i < history.length; i++) {
    repeatCounts.push(intersection(last.red, history[i].red).length);
  }
  var avgRepeat = avg(repeatCounts).toFixed(1);

  html += '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">历史平均重号</span><span class="result-value">' + avgRepeat + ' 个</span></div>';

  var repeatFreq = {};
  for (var i = 1; i < history.length; i++) {
    var repeats = intersection(history[i-1].red, history[i].red);
    for (var j = 0; j < repeats.length; j++) {
      repeatFreq[repeats[j]] = (repeatFreq[repeats[j]] || 0) + 1;
    }
  }

  var candidates = [];
  for (var i = 0; i < last.red.length; i++) {
    var n = last.red[i];
    var freq = repeatFreq[n] || 0;
    var reasons = [];
    if (freq >= 2) reasons.push('历史重号高频');
    var consecutive = 0;
    for (var j = 0; j < history.length; j++) {
      if (history[j].red.indexOf(n) >= 0) consecutive++;
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
    html += '<tr><td><span class="hl-red">' + pad(c.num) + '</span></td><td>' + c.freq + '</td><td>' + c.consecutive + '</td><td>' + badge + '</td><td>' + c.reasons.map(function(r){return '<span class="reason-tag">'+r+'</span>';}).join('') + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('ssq-repeat').innerHTML = html;
}

function renderSSQZone(allReds) {
  var html = '';
  var zoneNames = ['一区(01-11)', '二区(12-22)', '三区(23-33)'];
  var zoneCounts = [];

  for (var i = 0; i < allReds.length; i++) {
    var counts = [0, 0, 0];
    for (var j = 0; j < allReds[i].length; j++) {
      var n = allReds[i][j];
      if (n >= 1 && n <= 11) counts[0]++;
      else if (n >= 12 && n <= 22) counts[1]++;
      else counts[2]++;
    }
    zoneCounts.push(counts);
  }

  var avgCounts = [0, 0, 0];
  for (var i = 0; i < zoneCounts.length; i++) {
    for (var j = 0; j < 3; j++) avgCounts[j] += zoneCounts[i][j];
  }
  for (var j = 0; j < 3; j++) avgCounts[j] = (avgCounts[j] / zoneCounts.length).toFixed(1);

  html += '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">平均区间比</span><span class="result-value">' + avgCounts.join(' : ') + '</span></div>';
  html += '<div class="result-row"><span class="result-label">上期区间比</span><span class="result-value">' + zoneCounts[0].join(' : ') + '</span></div>';

  var recentAvg = [0, 0, 0];
  var recentN = Math.min(5, zoneCounts.length);
  for (var i = 0; i < recentN; i++) {
    for (var j = 0; j < 3; j++) recentAvg[j] += zoneCounts[i][j];
  }
  for (var j = 0; j < 3; j++) recentAvg[j] = (recentAvg[j] / recentN).toFixed(1);

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">区间偏移分析（近5期）</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>区间</th><th>近5期均值</th><th>历史均值</th><th>偏移</th><th>建议</th></tr>';
  for (var j = 0; j < 3; j++) {
    var diff = (recentAvg[j] - avgCounts[j]).toFixed(1);
    var suggestion = diff < -0.3 ? '<span class="badge badge-hot">偏少，建议关注</span>' :
                     diff > 0.3 ? '<span class="badge badge-cold">偏多，注意回调</span>' :
                     '<span class="badge badge-warm">正常</span>';
    html += '<tr><td>' + zoneNames[j] + '</td><td>' + recentAvg[j] + '</td><td>' + avgCounts[j] + '</td><td>' + (diff > 0 ? '+' : '') + diff + '</td><td>' + suggestion + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('ssq-zone').innerHTML = html;
  renderSSQZoneChart(zoneCounts, zoneNames);
}

function renderSSQSum(allReds) {
  var sums = allReds.map(function(r) { return sum(r); });
  var lastSum = sums[0];
  var avgSum = Math.round(avg(sums));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期和值</span><span class="result-value">' + lastSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均和值</span><span class="result-value">' + avgSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">和值范围</span><span class="result-value">' + min(sums) + ' ~ ' + max(sums) + '</span></div>';
  var diff = lastSum - avgSum;
  var trend = diff > 15 ? '偏高，下期可能回落' : diff < -15 ? '偏低，下期可能回升' : '正常波动范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';
  var sugMin = Math.max(40, avgSum - 15);
  var sugMax = Math.min(165, avgSum + 15);
  html += '<div class="result-row"><span class="result-label">建议和值范围</span><span class="result-value hl-gold">' + sugMin + ' ~ ' + sugMax + '</span></div>';
  html += '</div>';

  document.getElementById('ssq-sum').innerHTML = html;
  renderSSQSumChart(sums);
}

function renderSSQSpan(allReds) {
  var spans = allReds.map(function(r) { return span(r); });
  var lastSp = spans[0];
  var avgSp = Math.round(avg(spans));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期跨度</span><span class="result-value">' + lastSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均跨度</span><span class="result-value">' + avgSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">跨度范围</span><span class="result-value">' + min(spans) + ' ~ ' + max(spans) + '</span></div>';
  var diff = lastSp - avgSp;
  var trend = diff > 5 ? '偏大，下期可能缩小' : diff < -5 ? '偏小，下期可能扩大' : '正常范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';
  html += '</div>';

  document.getElementById('ssq-span').innerHTML = html;
  renderSSQSpanChart(spans);
}

function renderSSQHotCold(allReds, allBlues) {
  var freqMap = {};
  for (var i = 1; i <= 33; i++) freqMap[i] = 0;
  for (var i = 0; i < allReds.length; i++) {
    for (var j = 0; j < allReds[i].length; j++) {
      freqMap[allReds[i][j]]++;
    }
  }

  var totalPeriods = allReds.length;
  var expected = (6 / 33) * totalPeriods;

  var hot = [], warm = [], cold = [];
  for (var n = 1; n <= 33; n++) {
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
    html += '<div class="ball red hot tooltip" data-tip="' + hot[i].freq + '次">' + pad(hot[i].num) + '</div>';
  }
  html += '</div></div>';
  html += '<div><span class="badge badge-cold" style="margin-right:0.5rem">冷号 (' + cold.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < cold.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + cold[i].freq + '次">' + pad(cold[i].num) + '</div>';
  }
  html += '</div></div></div>';

  document.getElementById('ssq-hotcold').innerHTML = html;
  renderSSQFreqChart(freqMap, expected);
}

function renderSSQDanTuo(last, allReds, allBlues) {
  var scores = scoreSSQNumbers(last, allReds);
  scores.sort(function(a, b) { return b.totalScore - a.totalScore; });

  var danCandidates = scores.slice(0, 5);
  var tuoCandidates = scores.slice(5, 15);

  var backScores = scoreSSQBlueNumbers(last, allBlues);
  backScores.sort(function(a, b) { return b.totalScore - a.totalScore; });

  var html = '<div class="dantuo-section"><div class="dantuo-grid">';

  html += '<div class="dantuo-col">';
  html += '<h4><span class="dot" style="background:var(--accent3)"></span> 红球胆码推荐（' + danCandidates.length + '个）</h4>';
  html += '<div class="ball-row">';
  for (var i = 0; i < danCandidates.length; i++) {
    html += '<div class="ball green tooltip" data-tip="评分:' + danCandidates[i].totalScore.toFixed(1) + '">' + pad(danCandidates[i].num) + '</div>';
  }
  html += '</div>';
  html += '<div style="margin-top:0.75rem">';
  for (var i = 0; i < danCandidates.length; i++) {
    var c = danCandidates[i];
    html += '<div style="margin-bottom:0.5rem;font-size:0.82rem">';
    html += '<span class="hl-green">' + pad(c.num) + '</span> ';
    html += '<span style="color:var(--muted)">评分 ' + c.totalScore.toFixed(1) + '</span> ';
    html += c.reasons.map(function(r) { return '<span class="reason-tag">' + r + '</span>'; }).join('');
    html += '</div>';
  }
  html += '</div>';

  html += '<h4 style="margin-top:1rem"><span class="dot" style="background:var(--accent5)"></span> 红球拖码推荐</h4>';
  html += '<div class="ball-row">';
  for (var i = 0; i < tuoCandidates.length; i++) {
    html += '<div class="ball purple tooltip" data-tip="评分:' + tuoCandidates[i].totalScore.toFixed(1) + '">' + pad(tuoCandidates[i].num) + '</div>';
  }
  html += '</div></div>';

  html += '<div class="dantuo-col">';
  html += '<h4><span class="dot" style="background:var(--accent3)"></span> 蓝球胆码推荐</h4>';
  html += '<div class="ball-row">';
  for (var i = 0; i < Math.min(3, backScores.length); i++) {
    html += '<div class="ball green tooltip" data-tip="评分:' + backScores[i].totalScore.toFixed(1) + '">' + pad(backScores[i].num) + '</div>';
  }
  html += '</div>';
  html += '<div style="margin-top:0.75rem">';
  for (var i = 0; i < Math.min(3, backScores.length); i++) {
    html += '<div style="margin-bottom:0.5rem;font-size:0.82rem">';
    html += '<span class="hl-green">' + pad(backScores[i].num) + '</span> ';
    html += '<span style="color:var(--muted)">评分 ' + backScores[i].totalScore.toFixed(1) + '</span> ';
    html += backScores[i].reasons.map(function(r) { return '<span class="reason-tag">' + r + '</span>'; }).join('');
    html += '</div>';
  }
  html += '</div>';

  html += '<h4 style="margin-top:1rem"><span class="dot" style="background:var(--accent5)"></span> 蓝球拖码推荐</h4>';
  html += '<div class="ball-row">';
  for (var i = 3; i < Math.min(8, backScores.length); i++) {
    html += '<div class="ball purple tooltip" data-tip="评分:' + backScores[i].totalScore.toFixed(1) + '">' + pad(backScores[i].num) + '</div>';
  }
  html += '</div></div>';

  html += '</div></div>';
  document.getElementById('ssq-dantuo').innerHTML = html;
}

// 分析近15期趋势特征，用于动态调整评分权重
function getRecent15Trend(allDraws) {
  var recent = allDraws.slice(0, Math.min(15, allDraws.length));
  var oddCounts = [], bigCounts = [], pairCounts = [], sameTailCounts = [];
  var zoneCounts = [[], [], []];

  for (var i = 0; i < recent.length; i++) {
    var draw = recent[i].slice().sort(function(a,b){return a-b;});
    var odd = draw.filter(function(x){return x%2===1;}).length;
    var big = draw.filter(function(x){return x>16;}).length;
    oddCounts.push(odd);
    bigCounts.push(big);

    var pairs = 0;
    for (var j = 0; j < draw.length - 1; j++) {
      if (draw[j+1] - draw[j] === 1) pairs++;
    }
    pairCounts.push(pairs);

    var tails = {};
    for (var j = 0; j < draw.length; j++) {
      var t = draw[j] % 10;
      tails[t] = (tails[t] || 0) + 1;
    }
    var sameTail = 0;
    for (var t in tails) { if (tails[t] >= 2) sameTail++; }
    sameTailCounts.push(sameTail);

    var z1 = draw.filter(function(x){return x<=11;}).length;
    var z2 = draw.filter(function(x){return x>11&&x<=22;}).length;
    var z3 = draw.filter(function(x){return x>22;}).length;
    zoneCounts[0].push(z1);
    zoneCounts[1].push(z2);
    zoneCounts[2].push(z3);
  }

  function avg(arr) { return arr.reduce(function(a,b){return a+b;},0) / arr.length; }

  return {
    avgOdd: avg(oddCounts),
    avgBig: avg(bigCounts),
    avgPair: avg(pairCounts),
    avgSameTail: avg(sameTailCounts),
    avgZone: [avg(zoneCounts[0]), avg(zoneCounts[1]), avg(zoneCounts[2])],
    oddBias: oddCounts.filter(function(x){return x>=4||x<=2;}).length,
    bigBias: bigCounts.filter(function(x){return x>=4||x<=2;}).length,
    pairFreq: pairCounts.filter(function(x){return x>=1;}).length
  };
}

function scoreSSQNumbers(last, allReds) {
  var scores = [];
  var co = buildCoOccurrence(allReds);
  var trend15 = getRecent15Trend(allReds);
  for (var n = 1; n <= 33; n++) {
    var wf = weightedFreq(n, allReds, 10);
    var dist = getMissDistribution(n, allReds);
    var mp = getMissPercentile(n, allReds);
    var mk = markovProb(n, allReds);

    var mpScore = mp > 0.85 ? 1.0 : (mp > 0.7 ? 0.8 : (mp > 0.5 ? 0.6 : 0.3));
    var mkScore = mk.pBtoA > mk.pAtoA ? 0.9 : (mk.pBtoA > 0.3 ? 0.7 : 0.4);

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
    var zoneScore = zoneAvg < 1.5 ? 0.9 : zoneAvg < 2 ? 0.7 : 0.4;

    var tail = n % 10;
    var tails = [0,0,0,0,0,0,0,0,0,0];
    for (var i = 0; i < allReds.length; i++) {
      for (var j = 0; j < allReds[i].length; j++) {
        tails[allReds[i][j] % 10]++;
      }
    }
    var totalTails = tails.reduce(function(a,b){return a+b;},0) || 1;
    var tailFreq = tails.map(function(t){return t/totalTails;});
    var tailScore = 1 - Math.abs(tailFreq[tail] - 0.1) * 5;

    var isOdd = n % 2 === 1;
    var oddRatio = last.red.filter(function(x){return x%2===1;}).length / 6;
    var oddAltScore;
    if (oddRatio >= 0.83) {
      oddAltScore = isOdd ? 0.3 : 0.95;
    } else if (oddRatio <= 0.17) {
      oddAltScore = isOdd ? 0.95 : 0.3;
    } else {
      oddAltScore = (isOdd && oddRatio <= 0.6) || (!isOdd && oddRatio >= 0.4) ? 0.8 : 0.5;
    }
    // 近15期趋势强化：如果近15期奇偶偏态持续，额外强化回归
    if (trend15.oddBias >= 5) {
      if ((trend15.avgOdd >= 3.5 && !isOdd) || (trend15.avgOdd <= 2.5 && isOdd)) {
        oddAltScore += 0.15;
      }
    }

    var sizeScore = (n <= 16 && last.red.filter(function(x){return x<=16;}).length <= 3) || (n > 16 && last.red.filter(function(x){return x>16;}).length <= 3) ? 0.8 : 0.5;
    // 近15期趋势强化：大小偏态持续时额外强化回归
    if (trend15.bigBias >= 5) {
      if ((trend15.avgBig >= 3.5 && n <= 16) || (trend15.avgBig <= 2.5 && n > 16)) {
        sizeScore += 0.15;
      }
    }

    var neighborScore = 0;
    if (last.red.indexOf(n) >= 0) neighborScore = 0.9;
    else {
      for (var i = 0; i < last.red.length; i++) {
        if (Math.abs(n - last.red[i]) === 1) { neighborScore = 0.7; break; }
      }
    }

    var pairScore = pairHistoryScore(n, allReds);
    // 近15期趋势强化：如果近15期连号频繁，提升连号评分权重
    if (trend15.pairFreq >= 5) {
      pairScore *= 1.2;
    }

    var isHot = wf > 0.18;
    var isCold = mp > 0.7;
    var hcScore = (isHot || isCold) ? 0.8 : 0.5;

    var stability = 1 - Math.abs(wf - 0.18) * 3;

    var baseScore = wf*0.18 + mpScore*0.15 + mkScore*0.12 + zoneScore*0.10 + tailScore*0.08 + oddAltScore*0.05 + sizeScore*0.05 + neighborScore*0.08 + pairScore*0.06 + hcScore*0.08 + stability*0.05;

    var reasons = [];
    if (wf > 0.2) reasons.push('高频');
    if (mp > 0.8) reasons.push('深冷');
    if (mkScore > 0.8) reasons.push('冷转热');
    if (tailScore > 0.7) reasons.push('尾数');
    if (neighborScore > 0.7) reasons.push('邻号');
    if (zoneScore > 0.7) reasons.push('区间回补');
    if (hcScore > 0.7) reasons.push('冷热');
    if (stability > 0.7) reasons.push('稳定');
    if (pairScore > 0.5) reasons.push('连号');

    scores.push({ num: n, wf: wf, currentGap: dist.currentGap, mp: mp, mkScore: mkScore, zoneScore: zoneScore, tailScore: tailScore, oddAltScore: oddAltScore, sizeScore: sizeScore, neighborScore: neighborScore, pairScore: pairScore, hcScore: hcScore, stability: stability, baseScore: baseScore, coScore: 0, totalScore: baseScore, reasons: reasons });
  }
  var top10 = scores.slice().sort(function(a,b){return b.baseScore-a.baseScore;}).slice(0,10).map(function(s){return s.num;});
  scores.forEach(function(s){
    var coSum = 0, coCount = 0;
    top10.forEach(function(t){
      if (t !== s.num && co[s.num] && co[s.num][t]) { coSum += co[s.num][t]; coCount++; }
    });
    s.coScore = coCount ? Math.min(coSum/coCount/3, 1) : 0;
    s.totalScore = s.baseScore + s.coScore * 0.15;
  });
  return scores.sort(function(a, b) { return b.totalScore - a.totalScore; });
}


function scoreSSQBlueNumbers(last, allBlues) {
  var blueHistory = allBlues.map(function(b){ return [b]; });
  var scores = [];
  for (var n = 1; n <= 16; n++) {
    var wf = weightedFreq(n, blueHistory, 8);
    var dist = getMissDistribution(n, blueHistory);
    var mp = getMissPercentile(n, blueHistory);
    var mk = markovProb(n, blueHistory);

    var mpScore = mp > 0.85 ? 1.0 : (mp > 0.7 ? 0.8 : (mp > 0.5 ? 0.6 : 0.3));
    var mkScore = mk.pBtoA > mk.pAtoA ? 0.9 : (mk.pBtoA > 0.3 ? 0.7 : 0.4);

    var lastBlueOdd = last.blue % 2 === 1;
    var oddScore = (n % 2 === 1 && !lastBlueOdd) || (n % 2 === 0 && lastBlueOdd) ? 0.85 : 0.5;

    var lastBlueBig = last.blue > 8;
    var sizeScore = (n > 8 && !lastBlueBig) || (n <= 8 && lastBlueBig) ? 0.85 : 0.5;

    // 蓝球尾数分散评分
    var tail = n % 10;
    var tails = [0,0,0,0,0,0,0,0,0,0];
    for (var i = 0; i < allBlues.length; i++) {
      tails[allBlues[i] % 10]++;
    }
    var totalTails = tails.reduce(function(a,b){return a+b;},0) || 1;
    var tailFreq = tails.map(function(t){return t/totalTails;});
    var tailScore = 1 - Math.abs(tailFreq[tail] - 0.1) * 5;

    var totalScore = wf * 0.28 + mpScore * 0.22 + mkScore * 0.13 + oddScore * 0.13 + sizeScore * 0.13 + tailScore * 0.11;

    var reasons = [];
    if (wf > 0.2) reasons.push('高频');
    if (mp > 0.8) reasons.push('深冷');
    if (mkScore > 0.8) reasons.push('冷转热');
    if (oddScore > 0.7) reasons.push('奇偶');
    if (sizeScore > 0.7) reasons.push('大小');
    if (tailScore > 0.7) reasons.push('尾数');

    scores.push({ num: n, wf: wf, currentGap: dist.currentGap, mp: mp, mkScore: mkScore, oddScore: oddScore, sizeScore: sizeScore, tailScore: tailScore, totalScore: totalScore, reasons: reasons });
  }
  return scores.sort(function(a, b) { return b.totalScore - a.totalScore; });
}


function renderSSQRecommend(last, allReds, allBlues) {
  var frontScores = scoreSSQNumbers(last, allReds);
  var backScores = scoreSSQBlueNumbers(last, allBlues);
  var topFronts = frontScores.slice(0,10);
  var topBacks = backScores.slice(0,5);

  // 上期红球特征分析（用于动态回归）
  var lastRed = last.red;
  var lastOddRatio = lastRed.filter(function(x){return x%2===1;}).length / 6;
  var lastBigRatio = lastRed.filter(function(x){return x>16;}).length / 6;
  var lastHasPair = gapStats(lastRed.slice().sort(function(a,b){return a-b;})).pairs.length >= 1;

  function qualityScoreSSQ(reds, blue) {
    var s = reds.slice().sort(function(a,b){return a-b;});
    var sumVal = s.reduce(function(a,b){return a+b;},0);
    var spanVal = s[5]-s[0];
    var z1=s.filter(function(x){return x<=11;}).length;
    var z2=s.filter(function(x){return x>11&&x<=22;}).length;
    var z3=s.filter(function(x){return x>22;}).length;
    var odd=s.filter(function(x){return x%2===1;}).length;
    var big=s.filter(function(x){return x>16;}).length;
    var tails = {}; s.forEach(function(n){var t=n%10; tails[t]=(tails[t]||0)+1;});
    var maxTail = Math.max.apply(null, Object.keys(tails).map(function(k){return tails[k];}));
    var g = gapStats(s);
    var q = 40;
    if (sumVal>=60 && sumVal<=130) q+=12; else if (sumVal>=50 && sumVal<=140) q+=6;
    if (spanVal>=10 && spanVal<=28) q+=12; else if (spanVal>=8 && spanVal<=32) q+=6;
    if (z1>=1 && z2>=1 && z3>=1) q+=15; else if ((z1>=1&&z1<=3)&&(z2>=1&&z2<=3)) q+=8;
    if (odd>=2 && odd<=4) q+=10; else if (odd>=1 && odd<=5) q+=5;
    if (big>=2 && big<=4) q+=10; else if (big>=1 && big<=5) q+=5;
    if (maxTail<=2) q+=12; else if (maxTail<=3) q+=6;
    if (g.pairs.length>=1 && g.pairs.length<=2) q+=8; else if (g.pairs.length<=3) q+=4;
    if (g.maxGap<=12) q+=8; else if (g.maxGap<=15) q+=4;

    // ========== 基于上期特征的动态回归调整 ==========
    // 1. 奇偶回归：上期极端则下期强烈反向回归
    if ((lastOddRatio >= 0.83 && odd <= 3) || (lastOddRatio <= 0.17 && odd >= 3)) q += 4;
    else if ((lastOddRatio >= 0.67 && odd <= 3) || (lastOddRatio <= 0.33 && odd >= 3)) q += 2;
    // 2. 大小回归：上期极端则下期反向回归
    if ((lastBigRatio >= 0.83 && big <= 3) || (lastBigRatio <= 0.17 && big >= 3)) q += 4;
    else if ((lastBigRatio >= 0.67 && big <= 3) || (lastBigRatio <= 0.33 && big >= 3)) q += 2;
    // 3. 连号延续：上期有连号则下期有连号适当加分
    if (lastHasPair && g.pairs.length >= 1) q += 3;

    var fScore = s.reduce(function(sum,n){return sum+(frontScores.find(function(x){return x.num===n;})||{}).totalScore||0;},0);
    var bScore = (backScores.find(function(x){return x.num===blue;})||{}).totalScore||0;
    q += Math.min(fScore*8, 20) + Math.min(bScore*15, 10);
    return Math.min(100, Math.round(q));
  }

  function genStrategy1() {
    var picks = frontScores.slice(0,14).map(function(s){return s.num;});
    var best = null, bestQ = -1;
    for (var a=0;a<picks.length-5;a++)
    for (var b=a+1;b<picks.length-4;b++)
    for (var c=b+1;c<picks.length-3;c++)
    for (var d=c+1;d<picks.length-2;d++)
    for (var e=d+1;e<picks.length-1;e++)
    for (var f=e+1;f<picks.length;f++) {
      var reds=[picks[a],picks[b],picks[c],picks[d],picks[e],picks[f]];
      var bp = backScores.slice(0,5).map(function(s){return s.num;});
      for (var i=0;i<bp.length;i++) {
        var blue = bp[i];
        var q = qualityScoreSSQ(reds, blue);
        if (q>bestQ) {bestQ=q; best={reds:reds, blue:blue};}
      }
    }
    return best ? [best] : [];
  }

  function genStrategy2() {
    var hot = frontScores.slice(0,8).map(function(s){return s.num;});
    var cold = frontScores.filter(function(s){return s.mp>0.7;}).slice(0,6).map(function(s){return s.num;});
    var results = [];
    for (var i=0;i<3;i++) {
      var pool = hot.slice(0,4).concat(cold.slice(0,3));
      var unique = [];
      for (var j=0;j<pool.length && unique.length<6;j++) if (unique.indexOf(pool[j])<0) unique.push(pool[j]);
      for (var j=0;j<frontScores.length && unique.length<6;j++) {
        if (unique.indexOf(frontScores[j].num)<0) unique.push(frontScores[j].num);
      }
      unique.sort(function(a,b){return a-b;});
      var blue = backScores[i % backScores.length].num;
      results.push({reds:unique, blue:blue});
    }
    return results;
  }

  function genStrategy3() {
    var hot = frontScores.slice(0,6).map(function(s){return s.num;});
    var mp = frontScores.filter(function(s){return s.mkScore>0.7 && hot.indexOf(s.num)<0;}).slice(0,6).map(function(s){return s.num;});
    if (mp.length < 6) {
      var missSorted = frontScores.slice().sort(function(a,b){return b.mp - a.mp;});
      for (var i=0;i<missSorted.length && mp.length<6;i++) {
        if (hot.indexOf(missSorted[i].num)<0 && mp.indexOf(missSorted[i].num)<0) mp.push(missSorted[i].num);
      }
    }
    var pool = hot.concat(mp);
    var best = null, bestQ = -1;
    for (var a=0;a<pool.length-5;a++)
    for (var b=a+1;b<pool.length-4;b++)
    for (var c=b+1;c<pool.length-3;c++)
    for (var d=c+1;d<pool.length-2;d++)
    for (var e=d+1;e<pool.length-1;e++)
    for (var f=e+1;f<pool.length;f++) {
      var reds=[pool[a],pool[b],pool[c],pool[d],pool[e],pool[f]];
      var blue = backScores[0].num;
      var q = qualityScoreSSQ(reds, blue);
      if (q>bestQ) {bestQ=q; best={reds:reds, blue:blue};}
    }
    return best ? [best] : [];
  }

  var s1 = genStrategy1();
  var s2 = genStrategy2();
  var s3 = genStrategy3();

  var strategies = [
    {name:'严格约束优化', desc:'在Top14热号中遍历所有组合，通过硬性约束（和值/跨度/区间/奇偶/大小/尾数/连号）筛选最高分', combos:s1},
    {name:'热号+遗漏双轨', desc:'前4球从Top8热号抽取，后2球从遗漏百分位>70%的冷号补充', combos:s2},
    {name:'马尔可夫转移驱动', desc:'优先选择p(B→A) > p(A→A)的号码（冷转热概率高），辅以遗漏百分位', combos:s3}
  ];

  var html = '<div class="recommend-container" style="padding:12px"><h3 style="margin-top:0;color:var(--ink)">🎯 V2 严谨模型推荐</h3>';
  html += '<p style="color:var(--muted);font-size:12px;margin-bottom:12px">基于加权频率·遗漏百分位·马尔可夫转移·区间回补·尾数分散·奇偶回归·大小均衡·邻号·连号历史·冷热交替·共现矩阵·稳定性 十二维评分体系（含上期特征动态回归）</p>';

  strategies.forEach(function(st,i){
    html += '<div class="strategy-box" style="margin:12px 0;padding:12px;border:1px solid var(--rule);border-radius:8px;background:var(--bg2)">';
    html += '<h4 style="margin:0 0 6px 0;color:var(--ink)">策略'+(i+1)+'：'+st.name+'</h4>';
    html += '<p style="margin:0 0 8px 0;color:var(--muted);font-size:12px">'+st.desc+'</p>';
    st.combos.forEach(function(c,ci){
      var q = qualityScoreSSQ(c.reds, c.blue);
      html += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap">';
      html += '<span style="font-weight:bold;color:var(--accent4)">方案'+(ci+1)+'：</span>';
      html += '<span style="color:var(--ink)">红球：'+c.reds.map(function(n){return String(n).padStart(2,'0');}).join(', ')+'</span>';
      html += '<span style="color:var(--ink)">蓝球：'+String(c.blue).padStart(2,'0')+'</span>';
      html += '<span style="margin-left:auto;background:'+(q>=85?'var(--accent3)':(q>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:12px">质量分 '+q+'</span>';
      html += '</div>';
    });
    html += '</div>';
  });

  html += '<h4 style="margin-top:16px;color:var(--ink)">📊 红球 Top10 号码评分详情</h4>';
  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--bg3)">';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">号码</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">加权频率</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">当前遗漏</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">遗漏%位</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">转移概率</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">邻号分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">总评分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">理由</th>';
  html += '</tr></thead><tbody>';
  topFronts.forEach(function(s){
    var reason = [];
    if (s.wf > 0.2) reason.push('高频');
    if (s.mp > 0.8) reason.push('深冷');
    if (s.mkScore > 0.8) reason.push('冷转热');
    if (s.neighborScore > 0.7) reason.push('邻号');
    if (s.zoneScore > 0.7) reason.push('区间回补');
    if (s.hcScore > 0.7) reason.push('冷热');
    if (s.stability > 0.7) reason.push('稳定');
    html += '<tr><td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--ink)">'+String(s.num).padStart(2,'0')+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.wf*100).toFixed(1)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+s.currentGap+'期</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mp*100).toFixed(0)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mkScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.neighborScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent4)">'+(s.totalScore*100).toFixed(1)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(reason.join('·')||'-')+'</td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<h4 style="margin-top:16px;color:var(--ink)">🔵 蓝球 Top5 号码评分</h4>';
  html += '<div style="display:flex;gap:12px;flex-wrap:wrap">';
  topBacks.forEach(function(s){
    html += '<div style="padding:8px 12px;border:1px solid var(--rule);border-radius:6px;background:var(--bg3)">';
    html += '<span style="font-weight:bold;color:var(--accent2);font-size:16px">'+String(s.num).padStart(2,'0')+'</span>';
    html += '<span style="color:var(--muted);font-size:11px;margin-left:8px">'+(s.totalScore*100).toFixed(1)+'分 (遗漏'+s.currentGap+'期)</span>';
    html += '</div>';
  });
  html += '</div>';
  html += '<div class="disclaimer" style="margin-top:1.5rem"><strong>声明：</strong>以上推荐号码基于历史数据统计分析生成，仅供娱乐参考。彩票开奖为随机事件，不构成任何投注建议。</div>';
  html += '</div>';

  document.getElementById('ssq-recommend').innerHTML = html;
}


// ==================== 双色球新增分析 ====================

function renderSSQBlueTrend(allBlues) {
  var html = '<div class="result-section">';
  var blueFreq = {};
  for (var i = 1; i <= 16; i++) blueFreq[i] = 0;
  for (var i = 0; i < allBlues.length; i++) blueFreq[allBlues[i]]++;

  var hotBlue = [], coldBlue = [];
  for (var n = 1; n <= 16; n++) {
    if (blueFreq[n] >= 3) hotBlue.push({ num: n, freq: blueFreq[n] });
    else if (blueFreq[n] <= 1) coldBlue.push({ num: n, freq: blueFreq[n] });
  }
  hotBlue.sort(function(a,b){return b.freq-a.freq;});
  coldBlue.sort(function(a,b){return a.freq-b.freq;});

  html += '<div class="result-row"><span class="result-label">上期蓝球</span><span class="result-value hl-blue">' + pad(allBlues[0]) + '</span></div>';
  html += '<div class="result-row"><span class="result-label">蓝球遗漏</span><span class="result-value">';
  var miss = 0;
  for (var i = 0; i < allBlues.length; i++) {
    if (allBlues[i] === allBlues[0]) break;
    miss++;
  }
  html += miss === 0 ? '当期开出' : '已遗漏' + miss + '期';
  html += '</span></div>';

  html += '<div style="margin-top:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">蓝球热号</span><div class="ball-row">';
  for (var i = 0; i < hotBlue.length; i++) {
    html += '<div class="ball blue hot tooltip" data-tip="' + hotBlue[i].freq + '次">' + pad(hotBlue[i].num) + '</div>';
  }
  html += '</div></div>';
  html += '<div style="margin-top:0.5rem"><span class="badge badge-cold" style="margin-right:0.5rem">蓝球冷号</span><div class="ball-row">';
  for (var i = 0; i < coldBlue.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + coldBlue[i].freq + '次">' + pad(coldBlue[i].num) + '</div>';
  }
  html += '</div></div>';

  // Consecutive blue analysis
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">蓝球近10期走势</div>';
  html += '<div class="ball-row">';
  var recentN = Math.min(10, allBlues.length);
  for (var i = 0; i < recentN; i++) {
    html += '<div class="ball blue" style="width:36px;height:36px;font-size:0.75rem">' + pad(allBlues[i]) + '</div>';
  }
  html += '</div></div>';

  document.getElementById('ssq-blue-trend').innerHTML = html;
  renderSSQBlueChart(allBlues);
}

function renderSSQOddEven(allReds, allBlues) {
  var html = '<div class="result-section">';

  // Odd/even ratio
  var oddEvenRatios = [];
  for (var i = 0; i < allReds.length; i++) {
    var oddC = allReds[i].filter(function(n){return n%2===1;}).length;
    oddEvenRatios.push({ odd: oddC, even: 6 - oddC });
  }
  var avgOdd = (oddEvenRatios.reduce(function(s,r){return s+r.odd},0) / oddEvenRatios.length).toFixed(1);

  html += '<div class="result-row"><span class="result-label">上期奇偶比</span><span class="result-value">' + oddEvenRatios[0].odd + ':' + oddEvenRatios[0].even + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均奇数</span><span class="result-value">' + avgOdd + ' 个</span></div>';

  // Consecutive numbers analysis
  var consecCounts = [];
  for (var i = 0; i < allReds.length; i++) {
    var sorted = allReds[i].slice().sort(function(a,b){return a-b});
    var consec = 0;
    for (var j = 1; j < sorted.length; j++) {
      if (sorted[j] - sorted[j-1] === 1) consec++;
    }
    consecCounts.push(consec);
  }
  var avgConsec = (consecCounts.reduce(function(s,c){return s+c},0) / consecCounts.length).toFixed(1);

  html += '<div class="result-row"><span class="result-label">上期连号对数</span><span class="result-value">' + consecCounts[0] + ' 对</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均连号</span><span class="result-value">' + avgConsec + ' 对</span></div>';

  // Find consecutive pairs in last draw
  var lastSorted = allReds[0].slice().sort(function(a,b){return a-b});
  var pairs = [];
  for (var j = 1; j < lastSorted.length; j++) {
    if (lastSorted[j] - lastSorted[j-1] === 1) {
      pairs.push(pad(lastSorted[j-1]) + '-' + pad(lastSorted[j]));
    }
  }
  html += '<div class="result-row"><span class="result-label">上期连号</span><span class="result-value">' + (pairs.length > 0 ? pairs.join(', ') : '无') + '</span></div>';

  // Suggestion
  var oddDiff = oddEvenRatios[0].odd - avgOdd;
  var oddSug = oddDiff > 0.5 ? '奇数偏多，下期可能偶数回补' : oddDiff < -0.5 ? '偶数偏多，下期可能奇数回补' : '奇偶均衡';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + oddSug + '</span></div>';

  html += '</div>';
  document.getElementById('ssq-odd-even').innerHTML = html;
  renderSSQOddEvenChart(oddEvenRatios);
}

function renderSSQBlueMiss(allBlues) {
  var html = '<div class="result-section">';

  // Calculate miss count for each blue ball (01-16)
  var missData = {};
  for (var n = 1; n <= 16; n++) {
    var miss = 0;
    for (var i = 0; i < allBlues.length; i++) {
      if (allBlues[i] === n) break;
      miss++;
    }
    if (miss === allBlues.length) miss = allBlues.length;
    missData[n] = miss;
  }

  // Calculate average miss
  var totalMiss = 0;
  for (var n = 1; n <= 16; n++) totalMiss += missData[n];
  var avgMiss = (totalMiss / 16).toFixed(1);

  // Classify hot/cold based on miss
  var hotBalls = [], coldBalls = [];
  for (var n = 1; n <= 16; n++) {
    if (missData[n] <= Math.floor(avgMiss * 0.5)) {
      hotBalls.push({ num: n, miss: missData[n] });
    } else if (missData[n] >= avgMiss * 1.5) {
      coldBalls.push({ num: n, miss: missData[n] });
    }
  }
  hotBalls.sort(function(a,b){return a.miss - b.miss;});
  coldBalls.sort(function(a,b){return b.miss - a.miss;});

  // Max miss ball
  var maxMissBall = 1, maxMissVal = 0;
  for (var n = 1; n <= 16; n++) {
    if (missData[n] > maxMissVal) { maxMissVal = missData[n]; maxMissBall = n; }
  }

  html += '<div class="result-row"><span class="result-label">平均遗漏</span><span class="result-value">' + avgMiss + ' 期</span></div>';
  html += '<div class="result-row"><span class="result-label">最大遗漏</span><span class="result-value hl-blue">' + pad(maxMissBall) + ' (遗漏' + maxMissVal + '期)</span></div>';

  // Hot balls (low miss = frequent)
  html += '<div style="margin-top:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号(低遗漏)</span><div class="ball-row">';
  for (var i = 0; i < hotBalls.length; i++) {
    var badge = hotBalls[i].miss === 0 ? '当期开出' : '遗漏' + hotBalls[i].miss + '期';
    html += '<div class="ball blue hot tooltip" data-tip="' + badge + '">' + pad(hotBalls[i].num) + '</div>';
  }
  html += '</div></div>';

  // Cold balls (high miss)
  html += '<div style="margin-top:0.5rem"><span class="badge badge-cold" style="margin-right:0.5rem">冷号(高遗漏)</span><div class="ball-row">';
  for (var i = 0; i < coldBalls.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="遗漏' + coldBalls[i].miss + '期">' + pad(coldBalls[i].num) + '</div>';
  }
  html += '</div></div>';

  // Recommendation
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">蓝球推荐理由</div>';
  var reasons = [];
  // Recommend balls with moderate miss (due for appearance)
  var recommendBalls = [];
  for (var n = 1; n <= 16; n++) {
    if (missData[n] >= Math.floor(avgMiss) && missData[n] <= Math.ceil(avgMiss * 2)) {
      recommendBalls.push({ num: n, miss: missData[n] });
    }
  }
  recommendBalls.sort(function(a,b){return b.miss - a.miss;});
  var topRec = recommendBalls.slice(0, 3);
  for (var i = 0; i < topRec.length; i++) {
    var r = topRec[i];
    var reason = pad(r.num) + ': 遗漏' + r.miss + '期';
    if (r.miss >= avgMiss * 1.5) reason += '，遗漏偏大，回补概率增加';
    else if (r.miss >= avgMiss) reason += '，接近平均遗漏，有望开出';
    reasons.push(reason);
  }
  // Also recommend hot balls
  if (hotBalls.length > 0) {
    reasons.push(pad(hotBalls[0].num) + ': 近期热号，遗漏仅' + hotBalls[0].miss + '期');
  }
  for (var i = 0; i < reasons.length; i++) {
    html += '<div class="result-row"><span class="result-label">推荐' + (i+1) + '</span><span class="result-value" style="font-size:0.82rem">' + reasons[i] + '</span></div>';
  }

  html += '</div>';
  document.getElementById('ssq-blue-miss').innerHTML = html;
  renderSSQBlueMissChart(missData);
}

function renderSSQTail(allReds) {
  var html = '<div class="result-section">';

  // Count tail frequency (0-9)
  var tailFreq = {};
  for (var t = 0; t <= 9; t++) tailFreq[t] = 0;
  for (var i = 0; i < allReds.length; i++) {
    for (var j = 0; j < allReds[i].length; j++) {
      var tail = allReds[i][j] % 10;
      tailFreq[tail]++;
    }
  }

  var totalBalls = allReds.length * 6;
  var expected = totalBalls / 10;

  // Classify hot/cold tails
  var hotTails = [], coldTails = [];
  for (var t = 0; t <= 9; t++) {
    if (tailFreq[t] >= expected * 1.15) hotTails.push({ tail: t, freq: tailFreq[t] });
    else if (tailFreq[t] <= expected * 0.85) coldTails.push({ tail: t, freq: tailFreq[t] });
  }
  hotTails.sort(function(a,b){return b.freq - a.freq;});
  coldTails.sort(function(a,b){return a.freq - b.freq;});

  // Last draw tail coverage
  var lastTails = [];
  for (var j = 0; j < allReds[0].length; j++) {
    lastTails.push(allReds[0][j] % 10);
  }
  var uniqueLastTails = [];
  for (var i = 0; i < lastTails.length; i++) {
    if (uniqueLastTails.indexOf(lastTails[i]) < 0) uniqueLastTails.push(lastTails[i]);
  }

  html += '<div class="result-row"><span class="result-label">期望频率</span><span class="result-value">' + expected.toFixed(1) + ' 次/尾</span></div>';
  html += '<div class="result-row"><span class="result-label">上期尾数</span><span class="result-value">';
  for (var i = 0; i < uniqueLastTails.length; i++) {
    html += '<span class="hl-red" style="margin-right:0.3rem">尾' + uniqueLastTails[i] + '</span>';
  }
  html += ' (覆盖' + uniqueLastTails.length + '个尾数)</span></div>';

  // Hot tails
  html += '<div style="margin-top:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热尾</span><div class="ball-row">';
  for (var i = 0; i < hotTails.length; i++) {
    html += '<div class="ball red hot tooltip" data-tip="' + hotTails[i].freq + '次" style="font-size:0.75rem">尾' + hotTails[i].tail + '</div>';
  }
  html += '</div></div>';

  // Cold tails
  html += '<div style="margin-top:0.5rem"><span class="badge badge-cold" style="margin-right:0.5rem">冷尾</span><div class="ball-row">';
  for (var i = 0; i < coldTails.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + coldTails[i].freq + '次" style="font-size:0.75rem">尾' + coldTails[i].tail + '</div>';
  }
  html += '</div></div>';

  // Tail frequency detail
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">各尾数出现频率</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>尾数</th><th>出现次数</th><th>期望值</th><th>偏差</th><th>状态</th></tr>';
  for (var t = 0; t <= 9; t++) {
    var freq = tailFreq[t];
    var dev = ((freq - expected) / expected * 100).toFixed(1);
    var devStr = dev > 0 ? '+' + dev + '%' : dev + '%';
    var badge = freq >= expected * 1.15 ? '<span class="badge badge-hot">热尾</span>' :
                freq <= expected * 0.85 ? '<span class="badge badge-cold">冷尾</span>' :
                '<span class="badge badge-warm">正常</span>';
    html += '<tr><td><span class="hl-red">尾' + t + '</span></td><td>' + freq + '</td><td>' + expected.toFixed(1) + '</td><td>' + devStr + '</td><td>' + badge + '</td></tr>';
  }
  html += '</table></div>';

  // Suggestion
  var missingTails = [];
  for (var t = 0; t <= 9; t++) {
    if (uniqueLastTails.indexOf(t) < 0) missingTails.push(t);
  }
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">下期尾数建议</div>';
  if (missingTails.length > 0) {
    html += '<div class="result-row"><span class="result-label">未覆盖尾数</span><span class="result-value">';
    for (var i = 0; i < missingTails.length; i++) {
      html += '<span class="hl-blue" style="margin-right:0.3rem">尾' + missingTails[i] + '</span>';
    }
    html += '</span></div>';
    // Recommend cold tails for next draw
    var recTails = coldTails.slice(0, 2);
    if (recTails.length > 0) {
      html += '<div class="result-row"><span class="result-label">关注冷尾</span><span class="result-value">';
      for (var i = 0; i < recTails.length; i++) {
        html += '<span class="hl-gold" style="margin-right:0.5rem">尾' + recTails[i].tail + '(仅' + recTails[i].freq + '次)</span>';
      }
      html += '</span></div>';
    }
  }

  html += '</div>';
  document.getElementById('ssq-tail').innerHTML = html;
  renderSSQTailChart(tailFreq, expected);
}

// ==================== 快乐8分析 ====================

var KL8_ZONES = [[1,20],[21,40],[41,60],[61,80]];

var kl8SampleHistory = [
  '02,07,11,13,18,21,23,25,30,31,48,53,54,55,61,62,69,76,77,80',
  '01,03,05,08,09,12,19,24,27,30,32,47,51,52,59,64,67,74,75,80',
  '04,05,11,16,17,19,20,26,37,44,46,47,51,55,61,63,66,68,70,75',
  '01,02,08,13,16,18,19,30,33,37,39,40,56,57,63,69,71,73,76,78',
  '02,04,06,09,13,26,32,36,38,41,44,47,56,58,60,69,72,76,78,80',
  '04,05,08,12,22,23,26,27,35,39,47,50,56,58,60,61,66,70,71,77',
  '05,11,12,15,20,23,28,29,37,38,45,49,51,55,63,64,65,69,77,79',
  '01,03,06,08,14,18,29,38,39,42,44,46,49,51,57,58,61,75,77,80',
  '02,05,09,11,16,17,19,27,39,48,49,54,62,63,66,69,70,71,73,76',
  '07,10,11,12,17,18,24,27,30,31,32,34,42,49,54,59,64,65,71,72',
  '07,10,12,13,17,18,26,29,33,38,41,47,50,54,56,57,58,62,68,73',
  '01,07,17,19,20,21,22,23,35,37,43,44,49,51,53,59,66,71,77,78',
  '01,03,13,16,18,25,32,35,37,44,45,47,58,59,60,63,66,68,72,75',
  '03,04,06,10,12,21,24,36,37,38,41,42,44,45,49,52,70,73,77,78',
  '07,08,12,18,19,23,24,27,53,54,56,57,59,60,62,70,74,77,78,79',
  '02,04,10,12,13,17,23,30,31,33,37,43,47,55,58,62,65,72,75,77',
  '01,02,07,11,17,18,26,28,30,38,41,42,43,54,59,62,69,71,74,79',
  '03,06,07,10,11,12,14,17,22,24,28,35,37,38,45,50,52,67,77,79',
  '04,07,09,10,14,27,38,39,40,43,44,45,48,50,54,56,66,70,77,78',
  '02,04,05,15,19,24,27,29,32,33,36,38,50,52,60,64,66,69,74,75',
  '03,04,12,24,27,30,34,50,53,55,61,63,65,69,70,72,74,75,76,77',
  '02,03,07,11,14,23,30,31,34,38,39,41,47,51,52,60,63,68,72,78',
  '02,04,10,14,18,21,26,35,39,40,41,48,50,53,57,59,65,73,75,76',
  '06,09,10,20,21,28,33,38,48,49,52,54,57,64,66,70,72,74,75,77',
  '01,03,11,12,16,18,23,24,31,35,37,39,40,54,61,64,65,69,71,79',
  '02,06,07,09,10,11,14,19,22,23,26,30,36,40,41,44,47,51,53,60',
  '02,06,08,10,11,14,19,22,26,30,31,33,47,53,56,62,63,73,76,77',
  '04,08,09,13,14,15,16,17,18,23,28,39,47,48,53,56,63,66,77,79',
  '02,06,11,14,17,20,24,33,35,40,42,45,49,50,51,52,57,60,64,75',
  '08,13,20,23,24,27,29,37,42,48,49,50,51,57,59,60,64,65,67,77',
  '06,12,19,20,21,22,27,30,31,32,34,42,51,54,57,66,70,71,72,75',
  '01,06,09,16,18,19,21,26,27,29,55,58,59,60,62,66,73,74,76,80',
  '08,09,11,12,13,16,18,19,32,37,38,40,42,53,56,57,63,68,77,78',
  '07,19,25,28,32,33,36,38,43,44,46,50,55,61,65,70,71,72,73,79'
];

function loadKL8Sample() {
  var last = kl8SampleHistory[0];
  document.getElementById('kl8-numbers').value = last;
  document.getElementById('kl8-history').value = kl8SampleHistory.join('\n');
  // 填充复盘输入框默认值
  document.getElementById('kl8-review-numbers').value = last;
}

function clearKL8() {
  document.getElementById('kl8-numbers').value = '';
  document.getElementById('kl8-history').value = '';
  document.getElementById('kl8-results').style.display = 'none';
  document.getElementById('kl8-empty').style.display = 'block';
}

function analyzeKL8() {
  var numsStr = document.getElementById('kl8-numbers').value;
  var historyStr = document.getElementById('kl8-history').value;

  var lastNums = parseNums(numsStr);

  var lines = historyStr.trim().split('\n').filter(function(l) { return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 20) {
      history.push(nums.slice(0, 20).sort(function(a,b){return a-b}));
    }
  }

  if (history.length === 0 && lastNums.length >= 20) {
    history.unshift(lastNums.slice(0, 20).sort(function(a,b){return a-b}));
  }

  if (history.length < 2) { alert('请至少输入2期历史数据（每期20个号码）'); return; }

  var last = history[0];
  var playType = parseInt(document.getElementById('kl8-playtype').value);

  document.getElementById('kl8-empty').style.display = 'none';
  document.getElementById('kl8-results').style.display = 'block';

  renderKL8Stats(last, history);
  renderKL8Repeat(last, history);
  renderKL8Zone(history);
  renderKL8Sum(history);
  renderKL8Span(history);
  renderKL8HotCold(history);
  renderKL8OddEven(history);
  renderKL8Tail(history);
  renderKL8Consecutive(history);
  renderKL8AC(history);
  renderKL8DanTuo(last, history, playType);
  renderKL8AllPlayTypes_V2(last, history);

  document.getElementById('kl8-results').scrollIntoView({ behavior: 'smooth' });
}

function renderKL8Stats(last, history) {
  var s = sum(last);
  var sp = span(last);
  var sums = history.map(function(h) { return sum(h); });

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + s + '</div><div class="stat-label">上期和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + sp + '</div><div class="stat-label">上期跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">上期开奖号码</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < last.length; i++) {
    html += '<div class="ball gold" style="width:36px;height:36px;font-size:0.75rem">' + pad(last[i]) + '</div>';
  }
  html += '</div></div>';

  document.getElementById('kl8-stats').innerHTML = html;
}

function renderKL8Repeat(last, history) {
  var html = '';
  var repeatCounts = [];
  for (var i = 1; i < history.length; i++) {
    repeatCounts.push(intersection(last, history[i]).length);
  }
  var avgRepeat = avg(repeatCounts).toFixed(1);

  html += '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">历史平均重号</span><span class="result-value">' + avgRepeat + ' 个</span></div>';

  // Which last period numbers are likely to repeat
  var repeatFreq = {};
  for (var i = 1; i < history.length; i++) {
    var repeats = intersection(history[i-1], history[i]);
    for (var j = 0; j < repeats.length; j++) {
      repeatFreq[repeats[j]] = (repeatFreq[repeats[j]] || 0) + 1;
    }
  }

  var candidates = [];
  for (var i = 0; i < last.length; i++) {
    var n = last[i];
    var freq = repeatFreq[n] || 0;
    var reasons = [];
    if (freq >= Math.ceil(history.length * 0.4)) reasons.push('高频重号');
    if (freq >= Math.ceil(history.length * 0.2)) reasons.push('有重号先例');
    candidates.push({ num: n, freq: freq, reasons: reasons });
  }
  candidates.sort(function(a, b) { return b.freq - a.freq; });

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">重号可能性评估（按概率排序，前10个）</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < Math.min(10, candidates.length); i++) {
    var c = candidates[i];
    var cls = c.freq >= Math.ceil(history.length * 0.4) ? 'red hot' : c.freq >= Math.ceil(history.length * 0.2) ? 'gold' : 'gray';
    html += '<div class="ball ' + cls + ' tooltip" data-tip="' + c.freq + '次" style="width:36px;height:36px;font-size:0.75rem">' + pad(c.num) + '</div>';
  }
  html += '</div></div>';

  document.getElementById('kl8-repeat').innerHTML = html;
}

function renderKL8Zone(history) {
  var html = '';
  var zoneNames = ['一区(01-20)', '二区(21-40)', '三区(41-60)', '四区(61-80)'];
  var zoneCounts = [];

  for (var i = 0; i < history.length; i++) {
    var counts = [0, 0, 0, 0];
    for (var j = 0; j < history[i].length; j++) {
      var n = history[i][j];
      if (n <= 20) counts[0]++;
      else if (n <= 40) counts[1]++;
      else if (n <= 60) counts[2]++;
      else counts[3]++;
    }
    zoneCounts.push(counts);
  }

  var avgCounts = [0, 0, 0, 0];
  for (var i = 0; i < zoneCounts.length; i++) {
    for (var j = 0; j < 4; j++) avgCounts[j] += zoneCounts[i][j];
  }
  for (var j = 0; j < 4; j++) avgCounts[j] = (avgCounts[j] / zoneCounts.length).toFixed(1);

  html += '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">平均区间分布</span><span class="result-value">' + avgCounts.join(' : ') + '</span></div>';
  html += '<div class="result-row"><span class="result-label">上期区间分布</span><span class="result-value">' + zoneCounts[0].join(' : ') + '</span></div>';

  var recentAvg = [0, 0, 0, 0];
  var recentN = Math.min(5, zoneCounts.length);
  for (var i = 0; i < recentN; i++) {
    for (var j = 0; j < 4; j++) recentAvg[j] += zoneCounts[i][j];
  }
  for (var j = 0; j < 4; j++) recentAvg[j] = (recentAvg[j] / recentN).toFixed(1);

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">区间偏移分析</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>区间</th><th>近5期均值</th><th>历史均值</th><th>偏移</th><th>建议</th></tr>';
  for (var j = 0; j < 4; j++) {
    var diff = (recentAvg[j] - avgCounts[j]).toFixed(1);
    var suggestion = diff < -0.5 ? '<span class="badge badge-hot">偏少，建议关注</span>' :
                     diff > 0.5 ? '<span class="badge badge-cold">偏多，注意回调</span>' :
                     '<span class="badge badge-warm">正常</span>';
    html += '<tr><td>' + zoneNames[j] + '</td><td>' + recentAvg[j] + '</td><td>' + avgCounts[j] + '</td><td>' + (diff > 0 ? '+' : '') + diff + '</td><td>' + suggestion + '</td></tr>';
  }
  html += '</table></div></div>';

  document.getElementById('kl8-zone').innerHTML = html;
  renderKL8ZoneChart(zoneCounts, zoneNames);
}

function renderKL8Sum(history) {
  var sums = history.map(function(h) { return sum(h); });
  var lastSum = sums[0];
  var avgSum = Math.round(avg(sums));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期和值</span><span class="result-value">' + lastSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均和值</span><span class="result-value">' + avgSum + '</span></div>';
  html += '<div class="result-row"><span class="result-label">和值范围</span><span class="result-value">' + min(sums) + ' ~ ' + max(sums) + '</span></div>';
  var diff = lastSum - avgSum;
  var trend = diff > 30 ? '偏高，可能回落' : diff < -30 ? '偏低，可能回升' : '正常范围';
  html += '<div class="result-row"><span class="result-label">趋势判断</span><span class="result-value">' + trend + '</span></div>';
  html += '</div>';

  document.getElementById('kl8-sum').innerHTML = html;
  renderKL8SumChart(sums);
}

function renderKL8Span(history) {
  var spans = history.map(function(h) { return span(h); });
  var lastSp = spans[0];
  var avgSp = Math.round(avg(spans));

  var html = '<div class="result-section">';
  html += '<div class="result-row"><span class="result-label">上期跨度</span><span class="result-value">' + lastSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均跨度</span><span class="result-value">' + avgSp + '</span></div>';
  html += '<div class="result-row"><span class="result-label">跨度范围</span><span class="result-value">' + min(spans) + ' ~ ' + max(spans) + '</span></div>';
  html += '</div>';

  document.getElementById('kl8-span').innerHTML = html;
}

function renderKL8HotCold(history) {
  var freqMap = {};
  for (var i = 1; i <= 80; i++) freqMap[i] = 0;
  for (var i = 0; i < history.length; i++) {
    for (var j = 0; j < history[i].length; j++) {
      freqMap[history[i][j]]++;
    }
  }

  var totalPeriods = history.length;
  var expected = (20 / 80) * totalPeriods;

  var hot = [], cold = [];
  for (var n = 1; n <= 80; n++) {
    if (freqMap[n] >= expected * 1.3) hot.push({ num: n, freq: freqMap[n] });
    else if (freqMap[n] <= expected * 0.7) cold.push({ num: n, freq: freqMap[n] });
  }
  hot.sort(function(a, b) { return b.freq - a.freq; });
  cold.sort(function(a, b) { return a.freq - b.freq; });

  var html = '<div class="result-section">';
  html += '<div style="margin-bottom:1rem;color:var(--muted);font-size:0.85rem">理论期望频次: ' + expected.toFixed(1) + ' 次/' + totalPeriods + '期</div>';

  html += '<div style="margin-bottom:1rem"><span class="badge badge-hot" style="margin-right:0.5rem">热号 (' + hot.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < hot.length; i++) {
    html += '<div class="ball red hot tooltip" data-tip="' + hot[i].freq + '次" style="width:34px;height:34px;font-size:0.7rem">' + pad(hot[i].num) + '</div>';
  }
  html += '</div></div>';

  html += '<div><span class="badge badge-cold" style="margin-right:0.5rem">冷号 (' + cold.length + '个)</span><div class="ball-row">';
  for (var i = 0; i < cold.length; i++) {
    html += '<div class="ball gray cold tooltip" data-tip="' + cold[i].freq + '次" style="width:34px;height:34px;font-size:0.7rem">' + pad(cold[i].num) + '</div>';
  }
  html += '</div></div></div>';

  document.getElementById('kl8-hotcold').innerHTML = html;
  renderKL8FreqChart(freqMap, expected);
}

function renderKL8DanTuo(last, history, playType) {
  var scores = scoreKL8Numbers(last, history);
  scores.sort(function(a, b) { return b.totalScore - a.totalScore; });

  var danCount = Math.min(3, Math.floor(playType / 2));
  var tuoCount = Math.min(10, playType + 5);

  var danCandidates = scores.slice(0, danCount);
  var tuoCandidates = scores.slice(danCount, danCount + tuoCount);

  var html = '<div class="dantuo-section"><div class="dantuo-grid">';

  html += '<div class="dantuo-col">';
  html += '<h4><span class="dot" style="background:var(--accent3)"></span> 胆码推荐（' + danCandidates.length + '个）</h4>';
  html += '<div class="ball-row">';
  for (var i = 0; i < danCandidates.length; i++) {
    html += '<div class="ball green tooltip" data-tip="评分:' + danCandidates[i].totalScore.toFixed(1) + '">' + pad(danCandidates[i].num) + '</div>';
  }
  html += '</div>';
  html += '<div style="margin-top:0.75rem">';
  for (var i = 0; i < danCandidates.length; i++) {
    var c = danCandidates[i];
    html += '<div style="margin-bottom:0.5rem;font-size:0.82rem">';
    html += '<span class="hl-green">' + pad(c.num) + '</span> ';
    html += '<span style="color:var(--muted)">评分 ' + c.totalScore.toFixed(1) + '</span> ';
    html += c.reasons.map(function(r) { return '<span class="reason-tag">' + r + '</span>'; }).join('');
    html += '</div>';
  }
  html += '</div></div>';

  html += '<div class="dantuo-col">';
  html += '<h4><span class="dot" style="background:var(--accent5)"></span> 拖码推荐（' + tuoCandidates.length + '个）</h4>';
  html += '<div class="ball-row">';
  for (var i = 0; i < tuoCandidates.length; i++) {
    html += '<div class="ball purple tooltip" data-tip="评分:' + tuoCandidates[i].totalScore.toFixed(1) + '">' + pad(tuoCandidates[i].num) + '</div>';
  }
  html += '</div>';
  html += '<div style="margin-top:0.75rem;font-size:0.82rem;color:var(--muted)">提示：选' + playType + '玩法，' + danCandidates.length + '个胆码 + ' + (playType - danCandidates.length) + '个拖码 = C(' + tuoCandidates.length + ',' + (playType - danCandidates.length) + ') 注</div>';
  html += '</div>';

  html += '</div></div>';
  document.getElementById('kl8-dantuo').innerHTML = html;
}

function scoreKL8Numbers(last, history) {
  var scores = [];
  // KL8近15期趋势分析
  var recent15 = history.slice(0, Math.min(15, history.length));
  var kl8OddCounts = [], kl8BigCounts = [], kl8PairCounts = [];
  for (var i = 0; i < recent15.length; i++) {
    var draw = recent15[i].slice().sort(function(a,b){return a-b;});
    kl8OddCounts.push(draw.filter(function(x){return x%2===1;}).length);
    kl8BigCounts.push(draw.filter(function(x){return x>40;}).length);
    var pairs = 0;
    for (var j = 0; j < draw.length - 1; j++) {
      if (draw[j+1] - draw[j] === 1) pairs++;
    }
    kl8PairCounts.push(pairs);
  }
  function kl8Avg(arr) { return arr.reduce(function(a,b){return a+b;},0) / arr.length; }
  var kl8Trend = {
    avgOdd: kl8Avg(kl8OddCounts),
    avgBig: kl8Avg(kl8BigCounts),
    avgPair: kl8Avg(kl8PairCounts),
    oddBias: kl8OddCounts.filter(function(x){return x>=12||x<=8;}).length,
    bigBias: kl8BigCounts.filter(function(x){return x>=12||x<=8;}).length,
    pairFreq: kl8PairCounts.filter(function(x){return x>=4;}).length
  };

  for (var n = 1; n <= 80; n++) {
    var wf = weightedFreq(n, history, 12);
    var dist = getMissDistribution(n, history);
    var mp = getMissPercentile(n, history);
    var mk = markovProb(n, history);

    var mpScore = mp > 0.85 ? 1.0 : (mp > 0.7 ? 0.8 : (mp > 0.5 ? 0.6 : 0.3));
    var mkScore = mk.pBtoA > mk.pAtoA ? 0.9 : (mk.pBtoA > 0.3 ? 0.7 : 0.4);

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
    var zoneScore = zoneAvg < 4 ? 0.9 : zoneAvg < 5 ? 0.7 : 0.4;
    // 上期区间偏态回补：26174期三区(41-60)仅4个偏少，下期三区号码加分
    var lastZoneCounts = [0, 0, 0, 0];
    last.forEach(function(x){ lastZoneCounts[x<=20?0:x<=40?1:x<=60?2:3]++; });
    if (lastZoneCounts[zoneIdx] <= 4 && zoneIdx === 2) { zoneScore += 0.15; }
    else if (lastZoneCounts[zoneIdx] >= 6 && zoneIdx === 3) { zoneScore -= 0.08; }

    var odd = n % 2 === 1;
    var recentOdds = 0;
    for (var i = 0; i < recentN; i++) {
      recentOdds += history[i].filter(function(x){return x%2===1;}).length;
    }
    var oddRatio = recentOdds / (recentN * 20);
    var oddEvenScore = (odd && oddRatio <= 0.55) || (!odd && oddRatio >= 0.45) ? 0.85 : 0.5;
    // 近15期趋势强化
    if (kl8Trend.oddBias >= 5) {
      if ((kl8Trend.avgOdd >= 11 && !odd) || (kl8Trend.avgOdd <= 9 && odd)) {
        oddEvenScore += 0.15;
      }
    }
    // 26174期奇偶12:8奇数偏多，下期偶数回补信号强化
    var lastOddCount = last.filter(function(x){return x%2===1;}).length;
    if (lastOddCount >= 12 && !odd) { oddEvenScore += 0.12; }
    else if (lastOddCount <= 8 && odd) { oddEvenScore += 0.12; }

    var big = n > 40;
    var recentBig = 0;
    for (var i = 0; i < recentN; i++) {
      recentBig += history[i].filter(function(x){return x>40;}).length;
    }
    var bigRatio = recentBig / (recentN * 20);
    var bigSmallScore = (big && bigRatio <= 0.55) || (!big && bigRatio >= 0.45) ? 0.85 : 0.5;
    // 近15期趋势强化
    if (kl8Trend.bigBias >= 5) {
      if ((kl8Trend.avgBig >= 11 && !big) || (kl8Trend.avgBig <= 9 && big)) {
        bigSmallScore += 0.15;
      }
    }

    var tail = n % 10;
    var tails = [0,0,0,0,0,0,0,0,0,0];
    for (var i = 0; i < history.length; i++) {
      for (var j = 0; j < history[i].length; j++) {
        tails[history[i][j] % 10]++;
      }
    }
    var totalTails = tails.reduce(function(a,b){return a+b;},0) || 1;
    var tailFreq = tails.map(function(t){return t/totalTails;});
    var tailScore = 1 - Math.abs(tailFreq[tail] - 0.1) * 5;
    // 上期尾数偏态回补：26174期尾数1出现4次，下期关注其他尾数
    var lastTails = {};
    last.forEach(function(x){ lastTails[x%10] = (lastTails[x%10]||0) + 1; });
    if (lastTails[tail] >= 3) { tailScore -= 0.15; }
    else if (lastTails[tail] === 0) { tailScore += 0.10; }

    var neighborScore = 0;
    if (last.indexOf(n) >= 0) neighborScore = 0.9;
    else {
      for (var i = 0; i < last.length; i++) {
        if (Math.abs(n - last[i]) === 1) { neighborScore = 0.7; break; }
      }
    }
    // 重号历史频率优化：计算近5期平均重号数，若偏低则上期号码额外加分
    var repeatHistory = [];
    for (var ri = 0; ri < Math.min(5, history.length - 1); ri++) {
      repeatHistory.push(history[ri].filter(function(x){ return history[ri+1].indexOf(x) >= 0; }).length);
    }
    var avgRepeat = kl8Avg(repeatHistory);
    if (avgRepeat >= 3 && last.indexOf(n) >= 0) { neighborScore += 0.08; }

    // KL8连号历史频率评分
    var consecutiveScore = pairHistoryScore(n, history);

    var stability = 1 - Math.abs(wf - 0.25) * 3;

    var totalScore = wf * 0.19 + mpScore * 0.17 + mkScore * 0.12 + zoneScore * 0.11 + oddEvenScore * 0.10 + bigSmallScore * 0.10 + tailScore * 0.08 + neighborScore * 0.04 + stability * 0.05 + consecutiveScore * 0.04;

    var reasons = [];
    if (wf > 0.25) reasons.push('高频');
    if (mp > 0.8) reasons.push('深冷');
    if (mkScore > 0.8) reasons.push('冷转热');
    if (zoneScore > 0.7) reasons.push('区间');
    if (oddEvenScore > 0.7) reasons.push('奇偶');
    if (bigSmallScore > 0.7) reasons.push('大小');
    if (tailScore > 0.7) reasons.push('尾数');
    if (neighborScore > 0.7) reasons.push('邻号');
    if (consecutiveScore > 0.5) reasons.push('连号');
    if (stability > 0.7) reasons.push('稳定');

    scores.push({ num: n, wf: wf, currentGap: dist.currentGap, mp: mp, mkScore: mkScore, zoneScore: zoneScore, oddEvenScore: oddEvenScore, bigSmallScore: bigSmallScore, tailScore: tailScore, neighborScore: neighborScore, stability: stability, totalScore: totalScore, reasons: reasons });
  }
  return scores.sort(function(a, b) { return b.totalScore - a.totalScore; });
}


function renderKL8AllPlayTypes_V2(last, history) {
  var scores = scoreKL8Numbers(last, history);
  var topScores = scores.slice(0,15);

  function qualityScoreKL8(picks) {
    var s = picks.slice().sort(function(a,b){return a-b;});
    var sumVal = s.reduce(function(a,b){return a+b;},0);
    var spanVal = s[s.length-1]-s[0];
    var z1=s.filter(function(x){return x<=20;}).length;
    var z2=s.filter(function(x){return x>20&&x<=40;}).length;
    var z3=s.filter(function(x){return x>40&&x<=60;}).length;
    var z4=s.filter(function(x){return x>60;}).length;
    var odd=s.filter(function(x){return x%2===1;}).length;
    var big=s.filter(function(x){return x>40;}).length;
    var tails = {}; s.forEach(function(n){var t=n%10; tails[t]=(tails[t]||0)+1;});
    var maxTail = Math.max.apply(null, Object.keys(tails).map(function(k){return tails[k];}));
    var g = gapStats(s);
    var q = 30;
    if (sumVal>=Math.max(10, picks.length*5) && sumVal<=picks.length*60) q+=10;
    if (spanVal>=10 && spanVal<=70) q+=10;
    if (z1>=1 && z2>=1 && z3>=1 && z4>=1) q+=15;
    else if (z1+z2>=1 && z3+z4>=1) q+=8;
    if (odd>=Math.floor(picks.length*0.3) && odd<=Math.ceil(picks.length*0.7)) q+=10;
    if (big>=Math.floor(picks.length*0.3) && big<=Math.ceil(picks.length*0.7)) q+=10;
    if (maxTail<=Math.ceil(picks.length*0.3)+1) q+=10;
    if (g.pairs.length>=1 && g.pairs.length<=Math.ceil(picks.length*0.25)+1) q+=8;
    var fScore = s.reduce(function(sum,n){return sum+(scores.find(function(x){return x.num===n;})||{}).totalScore||0;},0);
    q += Math.min(fScore*3, 20);
    return Math.min(100, Math.round(q));
  }

  function genStrategy1(playType) {
    var picks = [];
    var used = {};
    var zoneLimits = [Math.ceil(playType/2), Math.ceil(playType/2), Math.ceil(playType/2), Math.ceil(playType/2)];
    var zoneCounts = [0,0,0,0];
    for (var i=0;i<scores.length && picks.length<playType;i++) {
      var n = scores[i].num;
      var z = n<=20?0:n<=40?1:n<=60?2:3;
      if (zoneCounts[z] < zoneLimits[z]) {
        picks.push(n);
        used[n] = true;
        zoneCounts[z]++;
      }
    }
    for (var i=0;i<scores.length && picks.length<playType;i++) {
      if (!used[scores[i].num]) {
        picks.push(scores[i].num);
        used[scores[i].num] = true;
      }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function genStrategy2(playType) {
    var hot = scores.slice(0, Math.max(playType, 10)).map(function(s){return s.num;});
    var cold = scores.filter(function(s){return s.mp>0.7;}).slice(0, Math.max(playType, 10)).map(function(s){return s.num;});
    var hotCount = Math.ceil(playType*0.5);
    var picks = hot.slice(0, hotCount).concat(cold.slice(0, playType-hotCount));
    var unique = [];
    for (var i=0;i<picks.length && unique.length<playType;i++) if (unique.indexOf(picks[i])<0) unique.push(picks[i]);
    for (var i=0;i<scores.length && unique.length<playType;i++) {
      if (unique.indexOf(scores[i].num)<0) unique.push(scores[i].num);
    }
    unique.sort(function(a,b){return a-b;});
    return unique;
  }

  function genStrategy3(playType) {
    var mk = scores.filter(function(s){return s.mkScore>0.7;}).slice(0, Math.max(playType, 12)).map(function(s){return s.num;});
    if (mk.length < playType) {
      var missSorted = scores.slice().sort(function(a,b){return b.mp - a.mp;});
      for (var i=0;i<missSorted.length && mk.length<playType;i++) {
        if (mk.indexOf(missSorted[i].num)<0) mk.push(missSorted[i].num);
      }
    }
    var picks = mk.slice(0, playType);
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  var html = '<div class="recommend-container" style="padding:12px"><h3 style="margin-top:0;color:var(--ink)">🎯 V2 全玩法推荐模型</h3>';
  html += '<p style="color:var(--muted);font-size:12px;margin-bottom:12px">基于加权频率·遗漏百分位·马尔可夫转移·区间均衡·奇偶均衡·大小均衡·尾数分散·连号历史·稳定性 十维评分体系（含上期特征动态回归）</p>';

  var playTypeNames = ['一','二','三','四','五','六','七','八','九','十'];

  for (var pt = 1; pt <= 10; pt++) {
    var s1 = genStrategy1(pt);
    var s2 = genStrategy2(pt);
    var s3 = genStrategy3(pt);
    var strategies = [
      {name:'区间均衡+热号', picks:s1, q:qualityScoreKL8(s1)},
      {name:'热号+遗漏双轨', picks:s2, q:qualityScoreKL8(s2)},
      {name:'马尔可夫转移驱动', picks:s3, q:qualityScoreKL8(s3)}
    ];

    html += '<div class="strategy-box" style="margin:12px 0;padding:12px;border:1px solid var(--rule);border-radius:8px;background:var(--bg2)">';
    html += '<h4 style="margin:0 0 6px 0;color:var(--ink)">选'+playTypeNames[pt-1]+'（'+pt+'个号码）</h4>';

    for (var si=0;si<strategies.length;si++) {
      var st = strategies[si];
      html += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap">';
      html += '<span style="font-weight:bold;color:var(--accent4)">方案'+(si+1)+'：</span>';
      html += '<span style="color:var(--ink)">'+st.picks.map(function(n){return String(n).padStart(2,'0');}).join(', ')+'</span>';
      html += '<span style="margin-left:auto;background:'+(st.q>=85?'var(--accent3)':(st.q>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:12px">质量分 '+st.q+'</span>';
      html += '</div>';
    }
    html += '</div>';

    // 选五/六/九复式：每组7个号码
    if (pt === 5 || pt === 6 || pt === 9) {
      var复式Picks = scores.slice(0, 7).map(function(s){return s.num;});
      var复式Q = qualityScoreKL8(复式Picks);
      var 复式Name = pt === 5 ? '五' : pt === 6 ? '六' : '九';
      html += '<div class="strategy-box" style="margin:12px 0;padding:12px;border:1px solid var(--rule);border-radius:8px;background:linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(59,130,246,0.08) 100%)">';
      html += '<h4 style="margin:0 0 6px 0;color:var(--ink)">选'+复式Name+'复式（7个号码·C(7,'+pt+')注）</h4>';
      html += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap">';
      html += '<span style="font-weight:bold;color:var(--accent)">复式方案：</span>';
      html += '<span style="color:var(--ink)">'+复式Picks.map(function(n){return String(n).padStart(2,'0');}).join(', ')+'</span>';
      html += '<span style="margin-left:auto;background:'+(复式Q>=85?'var(--accent3)':(复式Q>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:12px">质量分 '+复式Q+'</span>';
      html += '</div>';
      html += '<p style="margin:4px 0 0 0;color:var(--muted);font-size:11px">从7个号码中选取'+pt+'个，复式投注覆盖更多组合</p>';
      html += '</div>';
    }
  }

  html += '<h4 style="margin-top:16px;color:var(--ink)">📊 Top15 号码评分详情</h4>';
  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--bg3)">';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">号码</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">加权频率</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">当前遗漏</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">遗漏%位</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">转移概率</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">区间分</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">奇偶分</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">大小分</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">尾数分</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">总评分</th>';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">理由</th>';
  html += '</tr></thead><tbody>';

  topScores.forEach(function(s){
    var reason = [];
    if (s.wf > 0.25) reason.push('高频');
    if (s.mp > 0.8) reason.push('深冷');
    if (s.mkScore > 0.8) reason.push('冷转热');
    if (s.zoneScore > 0.7) reason.push('区间');
    if (s.oddEvenScore > 0.7) reason.push('奇偶');
    if (s.bigSmallScore > 0.7) reason.push('大小');
    if (s.tailScore > 0.7) reason.push('尾数');
    if (s.neighborScore > 0.7) reason.push('邻号');
    if (s.stability > 0.7) reason.push('稳定');
    html += '<tr><td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--ink)">'+String(s.num).padStart(2,'0')+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.wf*100).toFixed(1)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+s.currentGap+'期</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mp*100).toFixed(0)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mkScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.zoneScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.oddEvenScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.bigSmallScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.tailScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent4)">'+(s.totalScore*100).toFixed(1)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(reason.join('·')||'-')+'</td></tr>';
  });

  html += '</tbody></table></div>';
  html += '<div class="disclaimer" style="margin-top:1.5rem"><strong>声明：</strong>以上推荐号码基于历史数据统计分析生成，仅供娱乐参考。彩票开奖为随机事件，不构成任何投注建议。</div>';
  html += '</div>';

  document.getElementById('kl8-recommend').innerHTML = html;
}


// ==================== 快乐8新增分析 ====================

function renderKL8OddEven(history) {
  var html = '<div class="result-section">';

  // Odd/even ratio
  var oddEvenRatios = [];
  for (var i = 0; i < history.length; i++) {
    var oddC = history[i].filter(function(n){return n%2===1;}).length;
    oddEvenRatios.push({ odd: oddC, even: 20 - oddC });
  }
  var avgOdd = (oddEvenRatios.reduce(function(s,r){return s+r.odd},0) / oddEvenRatios.length).toFixed(1);

  html += '<div class="result-row"><span class="result-label">上期奇偶比</span><span class="result-value">' + oddEvenRatios[0].odd + ':' + oddEvenRatios[0].even + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均奇数</span><span class="result-value">' + avgOdd + ' 个</span></div>';

  // Big/small ratio
  var bigSmallRatios = [];
  for (var i = 0; i < history.length; i++) {
    var bigC = history[i].filter(function(n){return n>40;}).length;
    bigSmallRatios.push({ big: bigC, small: 20 - bigC });
  }
  var avgBig = (bigSmallRatios.reduce(function(s,r){return s+r.big},0) / bigSmallRatios.length).toFixed(1);

  html += '<div class="result-row"><span class="result-label">上期大小比</span><span class="result-value">' + bigSmallRatios[0].big + ':' + bigSmallRatios[0].small + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均大号</span><span class="result-value">' + avgBig + ' 个</span></div>';

  // Consecutive numbers
  var consecCounts = [];
  for (var i = 0; i < history.length; i++) {
    var sorted = history[i].slice().sort(function(a,b){return a-b});
    var consec = 0;
    for (var j = 1; j < sorted.length; j++) {
      if (sorted[j] - sorted[j-1] === 1) consec++;
    }
    consecCounts.push(consec);
  }
  var avgConsec = (consecCounts.reduce(function(s,c){return s+c},0) / consecCounts.length).toFixed(1);
  html += '<div class="result-row"><span class="result-label">上期连号对数</span><span class="result-value">' + consecCounts[0] + ' 对</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均连号</span><span class="result-value">' + avgConsec + ' 对</span></div>';

  var oddDiff = oddEvenRatios[0].odd - avgOdd;
  var oddSug = oddDiff > 1 ? '奇数偏多，下期可能偶数回补' : oddDiff < -1 ? '偶数偏多，下期可能奇数回补' : '奇偶均衡';
  html += '<div class="result-row"><span class="result-label">奇偶趋势</span><span class="result-value">' + oddSug + '</span></div>';

  var bigDiff = bigSmallRatios[0].big - avgBig;
  var bigSug = bigDiff > 1 ? '大号偏多，下期可能小号回补' : bigDiff < -1 ? '小号偏多，下期可能大号回补' : '大小均衡';
  html += '<div class="result-row"><span class="result-label">大小趋势</span><span class="result-value">' + bigSug + '</span></div>';

  html += '</div>';
  document.getElementById('kl8-odd-even').innerHTML = html;
  renderKL8OddEvenChart(oddEvenRatios);
}

function renderKL8Tail(history) {
  var html = '<div class="result-section">';

  // Tail number frequency (0-9)
  var tailFreq = {};
  for (var t = 0; t <= 9; t++) tailFreq[t] = 0;
  for (var i = 0; i < history.length; i++) {
    for (var j = 0; j < history[i].length; j++) {
      tailFreq[history[i][j] % 10]++;
    }
  }

  var totalNums = history.length * 20;
  var expected = totalNums / 10;

  var hotTails = [], coldTails = [];
  for (var t = 0; t <= 9; t++) {
    if (tailFreq[t] >= expected * 1.15) hotTails.push({ tail: t, freq: tailFreq[t] });
    else if (tailFreq[t] <= expected * 0.85) coldTails.push({ tail: t, freq: tailFreq[t] });
  }

  html += '<div class="result-row"><span class="result-label">理论期望</span><span class="result-value">每尾 ' + expected.toFixed(1) + ' 次</span></div>';

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">各尾数出现频次</div>';
  html += '<div class="ball-row">';
  for (var t = 0; t <= 9; t++) {
    var cls = tailFreq[t] >= expected * 1.15 ? 'red hot' : tailFreq[t] <= expected * 0.85 ? 'gray cold' : 'gold';
    html += '<div class="ball ' + cls + ' tooltip" data-tip="' + tailFreq[t] + '次" style="width:38px;height:38px;font-size:0.8rem">' + t + '</div>';
  }
  html += '</div>';

  html += '<div style="margin-top:0.75rem"><span class="badge badge-hot" style="margin-right:0.5rem">热尾</span>';
  for (var i = 0; i < hotTails.length; i++) {
    html += '<span style="color:var(--accent4);font-weight:600;margin-right:0.5rem">尾' + hotTails[i].tail + '(' + hotTails[i].freq + '次)</span>';
  }
  html += '</div>';
  html += '<div style="margin-top:0.25rem"><span class="badge badge-cold" style="margin-right:0.5rem">冷尾</span>';
  for (var i = 0; i < coldTails.length; i++) {
    html += '<span style="color:var(--accent2);font-weight:600;margin-right:0.5rem">尾' + coldTails[i].tail + '(' + coldTails[i].freq + '次)</span>';
  }
  html += '</div>';

  // Last draw tail coverage
  var lastTails = {};
  for (var j = 0; j < history[0].length; j++) {
    lastTails[history[0][j] % 10] = true;
  }
  var coveredCount = Object.keys(lastTails).length;
  html += '<div class="result-row" style="margin-top:0.75rem"><span class="result-label">上期尾数覆盖</span><span class="result-value">' + coveredCount + '/10</span></div>';

  var missingTails = [];
  for (var t = 0; t <= 9; t++) {
    if (!lastTails[t]) missingTails.push(t);
  }
  if (missingTails.length > 0) {
    html += '<div class="result-row"><span class="result-label">缺失尾数</span><span class="result-value">' + missingTails.join(', ') + ' → 下期可关注</span></div>';
  }

  html += '</div>';
  document.getElementById('kl8-tail').innerHTML = html;
  renderKL8TailChart(tailFreq, expected);
}

function renderKL8Consecutive(history) {
  var html = '<div class="result-section">';

  // Analyze consecutive pairs for each period
  var consecutiveCounts = [];
  var consecutiveDetails = [];
  for (var i = 0; i < history.length; i++) {
    var sorted = history[i].slice().sort(function(a,b){return a-b});
    var pairs = [];
    var runStart = sorted[0];
    var runLen = 1;
    for (var j = 1; j < sorted.length; j++) {
      if (sorted[j] - sorted[j-1] === 1) {
        runLen++;
      } else {
        if (runLen >= 2) {
          var run = [];
          for (var k = 0; k < runLen; k++) {
            run.push(sorted[j - runLen + k]);
          }
          pairs.push(run);
        }
        runLen = 1;
      }
    }
    if (runLen >= 2) {
      var run = [];
      for (var k = 0; k < runLen; k++) {
        run.push(sorted[sorted.length - runLen + k]);
      }
      pairs.push(run);
    }
    consecutiveCounts.push(pairs.length);
    consecutiveDetails.push(pairs);
  }

  var avgConsec = (consecutiveCounts.reduce(function(s,c){return s+c},0) / consecutiveCounts.length).toFixed(1);
  var maxConsec = Math.max.apply(null, consecutiveCounts);
  var minConsec = Math.min.apply(null, consecutiveCounts);

  html += '<div class="result-row"><span class="result-label">上期连号组数</span><span class="result-value">' + consecutiveCounts[0] + ' 组</span></div>';
  html += '<div class="result-row"><span class="result-label">历史平均连号</span><span class="result-value">' + avgConsec + ' 组</span></div>';
  html += '<div class="result-row"><span class="result-label">历史最大连号</span><span class="result-value">' + maxConsec + ' 组</span></div>';
  html += '<div class="result-row"><span class="result-label">历史最小连号</span><span class="result-value">' + minConsec + ' 组</span></div>';

  // Show last period consecutive details
  if (consecutiveDetails[0].length > 0) {
    html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">上期连号详情</div>';
    html += '<div class="ball-row">';
    for (var i = 0; i < consecutiveDetails[0].length; i++) {
      var group = consecutiveDetails[0][i];
      var label = group.map(function(n){return pad(n)}).join('-');
      html += '<div class="ball red" style="width:auto;min-width:60px;padding:0 10px;font-size:0.75rem;border-radius:20px">' + label + '</div>';
    }
    html += '</div>';
  } else {
    html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">上期无连号</div>';
  }

  // Trend analysis
  var recent3 = consecutiveCounts.slice(0, Math.min(3, consecutiveCounts.length));
  var recentAvg = (recent3.reduce(function(s,c){return s+c},0) / recent3.length).toFixed(1);
  var trend = '';
  if (recentAvg > avgConsec * 1.2) {
    trend = '近期连号偏多，下期可能减少';
  } else if (recentAvg < avgConsec * 0.8) {
    trend = '近期连号偏少，下期可能增加';
  } else {
    trend = '近期连号正常，维持均值附近';
  }
  html += '<div class="result-row" style="margin-top:0.75rem"><span class="result-label">连号趋势</span><span class="result-value">' + trend + '</span></div>';

  // Consecutive run length distribution
  var runLenDist = {};
  for (var i = 0; i < history.length; i++) {
    for (var j = 0; j < consecutiveDetails[i].length; j++) {
      var len = consecutiveDetails[i][j].length;
      runLenDist[len] = (runLenDist[len] || 0) + 1;
    }
  }
  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">连号长度分布（历史统计）</div>';
  html += '<div class="ball-row">';
  var maxRunLen = 0;
  for (var k in runLenDist) { if (parseInt(k) > maxRunLen) maxRunLen = parseInt(k); }
  for (var len = 2; len <= maxRunLen; len++) {
    var count = runLenDist[len] || 0;
    html += '<div class="ball ' + (count >= history.length * 0.3 ? 'red hot' : count >= history.length * 0.15 ? 'gold' : 'gray') + ' tooltip" data-tip="' + count + '期" style="width:42px;height:42px;font-size:0.75rem">' + len + '连</div>';
  }
  html += '</div>';

  html += '</div>';
  document.getElementById('kl8-consecutive').innerHTML = html;
  renderKL8ConsecutiveChart(consecutiveCounts);
}

function renderKL8AC(history) {
  var html = '<div class="result-section">';

  // AC value = number of unique differences between all pairs - (n-1)
  var acValues = [];
  for (var i = 0; i < history.length; i++) {
    var nums = history[i];
    var diffs = {};
    for (var a = 0; a < nums.length; a++) {
      for (var b = a + 1; b < nums.length; b++) {
        var d = Math.abs(nums[b] - nums[a]);
        diffs[d] = true;
      }
    }
    var ac = Object.keys(diffs).length - (nums.length - 1);
    acValues.push(ac);
  }

  var avgAC = (acValues.reduce(function(s,v){return s+v},0) / acValues.length).toFixed(1);
  var maxAC = Math.max.apply(null, acValues);
  var minAC = Math.min.apply(null, acValues);

  html += '<div class="result-row"><span class="result-label">上期AC值</span><span class="result-value">' + acValues[0] + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史平均AC值</span><span class="result-value">' + avgAC + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史最大AC值</span><span class="result-value">' + maxAC + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史最小AC值</span><span class="result-value">' + minAC + '</span></div>';

  // AC value distribution
  var acDist = {};
  for (var i = 0; i < acValues.length; i++) {
    acDist[acValues[i]] = (acDist[acValues[i]] || 0) + 1;
  }
  var sortedACs = Object.keys(acDist).map(function(k){return parseInt(k)}).sort(function(a,b){return a-b});

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">AC值分布</div>';
  html += '<div class="ball-row">';
  for (var i = 0; i < sortedACs.length; i++) {
    var v = sortedACs[i];
    var count = acDist[v];
    var cls = count >= history.length * 0.2 ? 'red hot' : count >= history.length * 0.1 ? 'gold' : 'gray';
    html += '<div class="ball ' + cls + ' tooltip" data-tip="' + count + '期" style="width:46px;height:46px;font-size:0.75rem">' + v + '</div>';
  }
  html += '</div>';

  // Trend analysis
  var recent3 = acValues.slice(0, Math.min(3, acValues.length));
  var recentAvg = (recent3.reduce(function(s,v){return s+v},0) / recent3.length).toFixed(1);
  var trend = '';
  if (recentAvg > avgAC * 1.05) {
    trend = '近期AC值偏高，号码离散度大，下期可能回落';
  } else if (recentAvg < avgAC * 0.95) {
    trend = '近期AC值偏低，号码集中度高，下期可能回升';
  } else {
    trend = '近期AC值稳定，号码分布正常';
  }
  html += '<div class="result-row" style="margin-top:0.75rem"><span class="result-label">AC值趋势</span><span class="result-value">' + trend + '</span></div>';

  // AC value interpretation
  var interpretation = '';
  if (acValues[0] >= maxAC * 0.9) {
    interpretation = '上期号码分布非常离散，差值种类丰富';
  } else if (acValues[0] <= minAC * 1.1) {
    interpretation = '上期号码分布较集中，差值种类较少';
  } else {
    interpretation = '上期号码分布适中，差值种类正常';
  }
  html += '<div class="result-row"><span class="result-label">分布解读</span><span class="result-value">' + interpretation + '</span></div>';

  html += '</div>';
  document.getElementById('kl8-ac').innerHTML = html;
  renderKL8ACChart(acValues);
}

// ==================== 上期选号复盘函数 ====================

function reviewDLT() {
  var userFront = parseNums(document.getElementById('dlt-review-numbers').value);
  var userBack = parseNums(document.getElementById('dlt-review-blue').value);
  if (userFront.length < 5) { alert('请输入至少5个前区号码'); return; }

  var last = dltSampleHistory[0].split('|');
  var lastFront = parseNums(last[0]);
  var lastBack = parseNums(last[1]);

  var hitFront = userFront.filter(function(n){ return lastFront.indexOf(n) >= 0; });
  var hitBack = userBack.filter(function(n){ return lastBack.indexOf(n) >= 0; });

  var html = '<div style="margin-bottom:0.5rem"><strong>上期开奖：</strong>前区 ' + lastFront.map(function(n){return pad(n);}).join(',') + ' + 后区 ' + lastBack.map(function(n){return pad(n);}).join(',') + '</div>';
  html += '<div style="margin-bottom:0.5rem"><strong>您的选号：</strong>前区 ' + userFront.map(function(n){return pad(n);}).join(',') + ' + 后区 ' + userBack.map(function(n){return pad(n);}).join(',') + '</div>';
  html += '<div class="stat-grid" style="margin:0.75rem 0">';
  html += '<div class="stat-item"><div class="stat-value">' + hitFront.length + '/5</div><div class="stat-label">前区命中</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + hitBack.length + '/2</div><div class="stat-label">后区命中</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + (hitFront.length + hitBack.length) + '/7</div><div class="stat-label">总命中</div></div>';
  html += '</div>';

  html += '<div style="margin-bottom:0.5rem"><strong>命中号码：</strong></div>';
  html += '<div class="ball-row">';
  userFront.forEach(function(n) {
    var isHit = lastFront.indexOf(n) >= 0;
    html += '<span class="ball ' + (isHit ? 'red' : 'gray') + '">' + pad(n) + '</span>';
  });
  html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
  userBack.forEach(function(n) {
    var isHit = lastBack.indexOf(n) >= 0;
    html += '<span class="ball ' + (isHit ? 'blue' : 'gray') + '">' + pad(n) + '</span>';
  });
  html += '</div>';

  var score = hitFront.length * 10 + hitBack.length * 15;
  var grade = score >= 60 ? '优秀' : score >= 40 ? '良好' : score >= 20 ? '一般' : '需改进';
  var color = score >= 60 ? 'var(--accent3)' : score >= 40 ? 'var(--accent4)' : score >= 20 ? 'var(--accent)' : 'var(--accent2)';
  html += '<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg3);border-radius:8px">';
  html += '<div style="font-size:1.1rem;font-weight:700;color:' + color + ';margin-bottom:0.5rem">综合评价：' + grade + '（得分 ' + score + '）</div>';
  html += '<div style="color:var(--muted);font-size:0.85rem">';
  if (hitFront.length >= 4) html += '前区命中率高，选号思路较好。';
  else if (hitFront.length >= 2) html += '前区有一定命中，建议多关注冷热号分析。';
  else html += '前区命中偏低，建议参考冷热号和遗漏分析调整选号策略。';
  if (hitBack.length >= 1) html += '后区命中不错，继续保持。';
  else html += '后区未命中，建议关注后区遗漏走势。';
  html += '</div></div>';

  document.getElementById('dlt-review-result').innerHTML = html;
}

function reviewSSQ() {
  var userRed = parseNums(document.getElementById('ssq-review-numbers').value);
  var userBlue = parseNums(document.getElementById('ssq-review-blue').value);
  if (userRed.length < 6) { alert('请输入至少6个红球号码'); return; }

  var last = ssqSampleHistory[0].split('|');
  var lastRed = parseNums(last[0]);
  var lastBlue = parseNums(last[1]);

  var hitRed = userRed.filter(function(n){ return lastRed.indexOf(n) >= 0; });
  var hitBlue = userBlue.filter(function(n){ return lastBlue.indexOf(n) >= 0; });

  var html = '<div style="margin-bottom:0.5rem"><strong>上期开奖：</strong>红球 ' + lastRed.map(function(n){return pad(n);}).join(',') + ' + 蓝球 ' + lastBlue.map(function(n){return pad(n);}).join(',') + '</div>';
  html += '<div style="margin-bottom:0.5rem"><strong>您的选号：</strong>红球 ' + userRed.map(function(n){return pad(n);}).join(',') + ' + 蓝球 ' + userBlue.map(function(n){return pad(n);}).join(',') + '</div>';
  html += '<div class="stat-grid" style="margin:0.75rem 0">';
  html += '<div class="stat-item"><div class="stat-value">' + hitRed.length + '/6</div><div class="stat-label">红球命中</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + hitBlue.length + '/1</div><div class="stat-label">蓝球命中</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + (hitRed.length + hitBlue.length) + '/7</div><div class="stat-label">总命中</div></div>';
  html += '</div>';

  html += '<div style="margin-bottom:0.5rem"><strong>命中号码：</strong></div>';
  html += '<div class="ball-row">';
  userRed.forEach(function(n) {
    var isHit = lastRed.indexOf(n) >= 0;
    html += '<span class="ball ' + (isHit ? 'red' : 'gray') + '">' + pad(n) + '</span>';
  });
  html += '<span style="margin:0 0.5rem;color:var(--muted)">+</span>';
  userBlue.forEach(function(n) {
    var isHit = lastBlue.indexOf(n) >= 0;
    html += '<span class="ball ' + (isHit ? 'blue' : 'gray') + '">' + pad(n) + '</span>';
  });
  html += '</div>';

  var score = hitRed.length * 10 + hitBlue.length * 25;
  var grade = score >= 60 ? '优秀' : score >= 40 ? '良好' : score >= 20 ? '一般' : '需改进';
  var color = score >= 60 ? 'var(--accent3)' : score >= 40 ? 'var(--accent4)' : score >= 20 ? 'var(--accent)' : 'var(--accent2)';
  html += '<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg3);border-radius:8px">';
  html += '<div style="font-size:1.1rem;font-weight:700;color:' + color + ';margin-bottom:0.5rem">综合评价：' + grade + '（得分 ' + score + '）</div>';
  html += '<div style="color:var(--muted);font-size:0.85rem">';
  if (hitRed.length >= 4) html += '红球命中率高，选号思路较好。';
  else if (hitRed.length >= 2) html += '红球有一定命中，建议多关注冷热号分析。';
  else html += '红球命中偏低，建议参考冷热号和遗漏分析调整选号策略。';
  if (hitBlue.length >= 1) html += '蓝球命中不错，继续保持。';
  else html += '蓝球未命中，建议关注蓝球遗漏走势。';
  html += '</div></div>';

  document.getElementById('ssq-review-result').innerHTML = html;
}

function reviewKL8() {
  var userNums = parseNums(document.getElementById('kl8-review-numbers').value);
  if (userNums.length < 1) { alert('请输入至少1个号码'); return; }

  var lastNums = parseNums(kl8SampleHistory[0]);
  var hitNums = userNums.filter(function(n){ return lastNums.indexOf(n) >= 0; });

  var html = '<div style="margin-bottom:0.5rem"><strong>上期开奖（20个）：</strong>' + lastNums.map(function(n){return pad(n);}).join(',') + '</div>';
  html += '<div style="margin-bottom:0.5rem"><strong>您的选号（' + userNums.length + '个）：</strong>' + userNums.map(function(n){return pad(n);}).join(',') + '</div>';
  html += '<div class="stat-grid" style="margin:0.75rem 0">';
  html += '<div class="stat-item"><div class="stat-value">' + hitNums.length + '</div><div class="stat-label">命中个数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + (userNums.length > 0 ? ((hitNums.length / userNums.length) * 100).toFixed(1) : 0) + '%</div><div class="stat-label">命中率</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + hitNums.length + '/20</div><div class="stat-label">开奖命中</div></div>';
  html += '</div>';

  html += '<div style="margin-bottom:0.5rem"><strong>命中号码：</strong></div>';
  html += '<div class="ball-row">';
  userNums.forEach(function(n) {
    var isHit = lastNums.indexOf(n) >= 0;
    html += '<span class="ball ' + (isHit ? 'gold' : 'gray') + '" style="width:36px;height:36px;font-size:0.75rem">' + pad(n) + '</span>';
  });
  html += '</div>';

  var hitRate = userNums.length > 0 ? hitNums.length / userNums.length : 0;
  var score = hitRate * 100;
  var grade = score >= 50 ? '优秀' : score >= 30 ? '良好' : score >= 15 ? '一般' : '需改进';
  var color = score >= 50 ? 'var(--accent3)' : score >= 30 ? 'var(--accent4)' : score >= 15 ? 'var(--accent)' : 'var(--accent2)';
  html += '<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg3);border-radius:8px">';
  html += '<div style="font-size:1.1rem;font-weight:700;color:' + color + ';margin-bottom:0.5rem">综合评价：' + grade + '（命中率 ' + score.toFixed(1) + '%）</div>';
  html += '<div style="color:var(--muted);font-size:0.85rem">';
  if (hitNums.length >= 5) html += '命中个数较多，选号覆盖面广，思路较好。';
  else if (hitNums.length >= 2) html += '有一定命中，建议多关注冷热号分布和区间平衡。';
  else html += '命中偏低，建议参考冷热号分析和四区间分布调整选号策略。';
  html += '</div></div>';

  document.getElementById('kl8-review-result').innerHTML = html;
}
