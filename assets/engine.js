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

// ==================== 高级分析工具函数 ====================

/**
 * 信息熵分析：衡量号码分布的均匀程度
 * 熵值高 = 分布均匀，熵值低 = 分布集中（冷热分明）
 */
function entropyAnalysis(history, maxNum) {
  var freq = {};
  for (var i = 1; i <= maxNum; i++) freq[i] = 0;
  var total = 0;
  for (var i = 0; i < history.length; i++) {
    for (var j = 0; j < history[i].length; j++) {
      freq[history[i][j]] = (freq[history[i][j]] || 0) + 1;
      total++;
    }
  }
  if (!total) return { entropy: 0, maxEntropy: Math.log(maxNum) / Math.LN2, ratio: 0 };
  var entropy = 0;
  for (var n = 1; n <= maxNum; n++) {
    var p = freq[n] / total;
    if (p > 0) entropy -= p * Math.log(p) / Math.LN2;
  }
  var maxEntropy = Math.log(maxNum) / Math.LN2;
  return { entropy: entropy, maxEntropy: maxEntropy, ratio: entropy / maxEntropy };
}

/**
 * 移动平均趋势线：追踪号码在多个时间窗口的出现频率
 * 返回短期(5期)、中期(15期)、长期(全部)的频率及趋势方向
 */
function movingAverageTrend(num, history) {
  var shortWindow = Math.min(5, history.length);
  var midWindow = Math.min(15, history.length);
  var longWindow = history.length;

  var shortCount = 0, midCount = 0, longCount = 0;
  for (var i = 0; i < history.length; i++) {
    var hasNum = history[i].indexOf(num) >= 0;
    if (hasNum) {
      if (i < shortWindow) shortCount++;
      if (i < midWindow) midCount++;
      longCount++;
    }
  }

  var shortFreq = shortWindow > 0 ? shortCount / shortWindow : 0;
  var midFreq = midWindow > 0 ? midCount / midWindow : 0;
  var longFreq = longWindow > 0 ? longCount / longWindow : 0;

  var trend = 'stable';
  if (shortFreq > midFreq * 1.3 && midFreq >= longFreq) trend = 'up';
  else if (shortFreq < midFreq * 0.7 && midFreq <= longFreq) trend = 'down';
  else if (shortFreq > longFreq * 1.2) trend = 'warming';
  else if (shortFreq < longFreq * 0.8) trend = 'cooling';

  return { shortFreq: shortFreq, midFreq: midFreq, longFreq: longFreq, trend: trend };
}

/**
 * 周期性分析：计算号码的平均出现周期
 * 返回平均周期、当前遗漏/周期比值（接近1时该"出"了）
 */
function cycleAnalysis(num, history) {
  var gaps = [];
  var lastIdx = -1;
  for (var i = history.length - 1; i >= 0; i--) {
    if (history[i].indexOf(num) >= 0) {
      if (lastIdx >= 0) gaps.push(lastIdx - i);
      lastIdx = i;
    }
  }
  var avgCycle = gaps.length > 0 ? gaps.reduce(function(a, b) { return a + b; }, 0) / gaps.length : history.length;
  var currentGap = lastIdx >= 0 ? lastIdx + 1 : history.length;
  var cycleRatio = avgCycle > 0 ? currentGap / avgCycle : 0;
  var score = 0.5;
  if (cycleRatio >= 0.8 && cycleRatio <= 1.2) score = 1.0; // 恰好在周期点
  else if (cycleRatio >= 0.6 && cycleRatio <= 1.5) score = 0.85;
  else if (cycleRatio >= 1.5) score = 0.95; // 超周期，强烈回补
  else if (cycleRatio <= 0.4) score = 0.3; // 刚出不久
  return { avgCycle: avgCycle, currentGap: currentGap, cycleRatio: cycleRatio, score: score };
}

/**
 * 组合间多样性评分：计算多个推荐方案的差异度
 * 返回0-1的值，1表示完全多样化，0表示完全相同
 */
function comboDiversityScore(combos) {
  if (combos.length <= 1) return 1;
  var totalPairs = 0;
  var totalDiff = 0;
  for (var i = 0; i < combos.length; i++) {
    for (var j = i + 1; j < combos.length; j++) {
      var a = combos[i].slice().sort(function(a, b) { return a - b; });
      var b = combos[j].slice().sort(function(a, b) { return a - b; });
      var common = 0;
      for (var ai = 0; ai < a.length; ai++) {
        if (b.indexOf(a[ai]) >= 0) common++;
      }
      var maxLen = Math.max(a.length, b.length);
      var diffRate = maxLen > 0 ? 1 - common / maxLen : 1;
      totalDiff += diffRate;
      totalPairs++;
    }
  }
  return totalPairs > 0 ? totalDiff / totalPairs : 1;
}

/**
 * 回测系统：用历史数据验证推荐模型的命中率
 * 用前N期数据训练，预测第N+1期，对比实际结果
 */
function backtestModel(history, scoreFunc, recommendFunc, count, numPerDraw) {
  var results = [];
  var missedNumbers = {}; // 统计推荐中被遗漏的实际开奖号码
  var testCount = Math.min(15, Math.floor(history.length / 2));
  for (var i = 0; i < testCount; i++) {
    var trainEnd = history.length - testCount + i;
    var trainData = history.slice(0, trainEnd);
    var actual = history[trainEnd];
    if (!actual || trainData.length < 5) continue;
    var recommendation = recommendFunc(trainData, count);
    var hit = 0;
    var hitNums = [];
    for (var j = 0; j < recommendation.length; j++) {
      if (actual.indexOf(recommendation[j]) >= 0) {
        hit++;
        hitNums.push(recommendation[j]);
      }
    }
    results.push({ hit: hit, total: count, actualInDraw: numPerDraw, rate: hit / count, hitNums: hitNums, recommendation: recommendation });
    // 统计实际开奖中未进入推荐的号码
    for (var k = 0; k < actual.length; k++) {
      if (recommendation.indexOf(actual[k]) < 0) {
        missedNumbers[actual[k]] = (missedNumbers[actual[k]] || 0) + 1;
      }
    }
  }
  if (!results.length) return { avgHit: 0, avgRate: 0, tests: 0, missedNumbers: {} };
  var avgHit = results.reduce(function(s, r) { return s + r.hit; }, 0) / results.length;
  var avgRate = results.reduce(function(s, r) { return s + r.rate; }, 0) / results.length;
  var bestHit = Math.max.apply(null, results.map(function(r){return r.hit;}));
  var worstHit = Math.min.apply(null, results.map(function(r){return r.hit;}));
  var hitZeroCount = results.filter(function(r){return r.hit===0;}).length;
  // 找出遗漏最多的号码
  var missedSorted = Object.keys(missedNumbers).map(function(n){return {num: parseInt(n), count: missedNumbers[n]};}).sort(function(a,b){return b.count-a.count;});
  return { avgHit: avgHit, avgRate: avgRate, tests: results.length, details: results, bestHit: bestHit, worstHit: worstHit, hitZeroCount: hitZeroCount, missedNumbers: missedSorted };
}

// ==================== 大乐透分析 ====================

var DLT_ZONES = [[1,12],[13,23],[24,35]];
var DLT_BACK_ZONES = [[1,4],[5,8],[9,12]];

var dltSampleHistory = [
  '11,18,22,25,29|04,12',
  '01,06,16,18,26|04,10',
  '01,04,10,23,25|01,12',
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

function renderDLTHistoryTable() {
  var historyStr = document.getElementById('dlt-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l) { return l.trim(); });
  if (lines.length === 0) {
    document.getElementById('dlt-history-table-wrap').style.display = 'none';
    return;
  }

  var tbody = document.querySelector('#dlt-history-table tbody');
  if (!tbody) return;

  // 大乐透每周一、三、六开奖，从最近一期倒推日期
  var drawDays = [1, 3, 6]; // 周一、三、六
  var today = new Date();
  var lastDrawDate = new Date(today);
  // 找到最近的一个开奖日
  while (drawDays.indexOf(lastDrawDate.getDay()) < 0) {
    lastDrawDate.setDate(lastDrawDate.getDate() - 1);
  }

  var html = '';
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    if (parts.length < 2) continue;
    var frontNums = parts[0].split(',').filter(function(n){return n.trim();});
    var backNums = parts[1].split(',').filter(function(n){return n.trim();});

    // 推算期号：假设最新一期有期号，倒推
    var periodNum = lines.length - i;

    // 推算日期：倒推开奖日
    var drawDate = new Date(lastDrawDate);
    var steps = i;
    while (steps > 0) {
      drawDate.setDate(drawDate.getDate() - 1);
      if (drawDays.indexOf(drawDate.getDay()) >= 0) {
        steps--;
      }
    }
    var dateStr = drawDate.getFullYear() + '-' + String(drawDate.getMonth()+1).padStart(2,'0') + '-' + String(drawDate.getDate()).padStart(2,'0');

    html += '<tr style="border-bottom:1px solid var(--rule)">';
    html += '<td style="padding:8px 10px;text-align:center;color:var(--muted);white-space:nowrap">' + periodNum + '</td>';
    html += '<td style="padding:8px 10px;text-align:center;color:var(--muted);white-space:nowrap">' + dateStr + '</td>';
    html += '<td style="padding:8px 10px;text-align:center">';
    for (var j = 0; j < frontNums.length; j++) {
      html += '<span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background:#4a90d9;color:#fff;font-size:0.75rem;font-weight:600;margin:1px">' + frontNums[j] + '</span>';
    }
    html += '</td>';
    html += '<td style="padding:8px 10px;text-align:center">';
    for (var j = 0; j < backNums.length; j++) {
      html += '<span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background:#f5a623;color:#fff;font-size:0.75rem;font-weight:600;margin:1px">' + backNums[j] + '</span>';
    }
    html += '</td>';
    html += '</tr>';
  }

  tbody.innerHTML = html;
  document.getElementById('dlt-history-table-wrap').style.display = 'block';
}

function addDLTInputRow() {
  var tbody = document.querySelector('#dlt-input-table tbody');
  if (!tbody) return;
  var rowCount = tbody.children.length;
  var tr = document.createElement('tr');
  tr.setAttribute('data-row', rowCount);
  tr.innerHTML = '<td style="padding:6px 8px;border:1px solid var(--rule);text-align:center;color:var(--muted)">' + (rowCount + 1) + '</td>' +
    '<td style="padding:6px 8px;border:1px solid var(--rule)"><input type="text" class="dlt-input-front" placeholder="如: 03,15,22,28,35" style="width:100%;border:none;background:transparent;font-size:0.85rem;padding:4px"></td>' +
    '<td style="padding:6px 8px;border:1px solid var(--rule)"><input type="text" class="dlt-input-back" placeholder="如: 04,09" style="width:100%;border:none;background:transparent;font-size:0.85rem;padding:4px;text-align:center"></td>' +
    '<td style="padding:6px 8px;border:1px solid var(--rule);text-align:center"><button type="button" onclick="removeDLTInputRow(this)" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:1rem">&times;</button></td>';
  tbody.appendChild(tr);
  // 绑定输入事件同步到textarea
  var frontInput = tr.querySelector('.dlt-input-front');
  var backInput = tr.querySelector('.dlt-input-back');
  if (frontInput) frontInput.addEventListener('blur', syncDLTInputToTextarea);
  if (backInput) backInput.addEventListener('blur', syncDLTInputToTextarea);
}

function removeDLTInputRow(btn) {
  var tbody = document.querySelector('#dlt-input-table tbody');
  if (!tbody) return;
  var tr = btn.closest('tr');
  if (tr) tr.remove();
  // 重新编号
  var rows = tbody.querySelectorAll('tr');
  for (var i = 0; i < rows.length; i++) {
    rows[i].setAttribute('data-row', i);
    var numCell = rows[i].querySelector('td:first-child');
    if (numCell) numCell.textContent = i + 1;
  }
  syncDLTInputToTextarea();
}

function syncDLTInputToTextarea() {
  var tbody = document.querySelector('#dlt-input-table tbody');
  if (!tbody) return;
  var lines = [];
  var rows = tbody.querySelectorAll('tr');
  for (var i = 0; i < rows.length; i++) {
    var front = rows[i].querySelector('.dlt-input-front');
    var back = rows[i].querySelector('.dlt-input-back');
    var frontVal = front ? front.value.trim() : '';
    var backVal = back ? back.value.trim() : '';
    if (frontVal && backVal) {
      lines.push(frontVal + '|' + backVal);
    }
  }
  document.getElementById('dlt-history').value = lines.join('\n');
}

function fillDLTInputTable(dataLines) {
  var tbody = document.querySelector('#dlt-input-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  for (var i = 0; i < dataLines.length; i++) {
    var parts = dataLines[i].split('|');
    var front = parts[0] || '';
    var back = parts[1] || '';
    var tr = document.createElement('tr');
    tr.setAttribute('data-row', i);
    tr.innerHTML = '<td style="padding:6px 8px;border:1px solid var(--rule);text-align:center;color:var(--muted)">' + (i + 1) + '</td>' +
      '<td style="padding:6px 8px;border:1px solid var(--rule)"><input type="text" class="dlt-input-front" value="' + front + '" placeholder="如: 03,15,22,28,35" style="width:100%;border:none;background:transparent;font-size:0.85rem;padding:4px"></td>' +
      '<td style="padding:6px 8px;border:1px solid var(--rule)"><input type="text" class="dlt-input-back" value="' + back + '" placeholder="如: 04,09" style="width:100%;border:none;background:transparent;font-size:0.85rem;padding:4px;text-align:center"></td>' +
      '<td style="padding:6px 8px;border:1px solid var(--rule);text-align:center"><button type="button" onclick="removeDLTInputRow(this)" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:1rem">&times;</button></td>';
    tbody.appendChild(tr);
    // 绑定blur事件
    var frontInput = tr.querySelector('.dlt-input-front');
    var backInput = tr.querySelector('.dlt-input-back');
    if (frontInput) frontInput.addEventListener('blur', syncDLTInputToTextarea);
    if (backInput) backInput.addEventListener('blur', syncDLTInputToTextarea);
  }
  syncDLTInputToTextarea();
}

function loadDLTSample() {
  var last = dltSampleHistory[0];
  var parts = last.split('|');
  document.getElementById('dlt-front').value = parts[0];
  document.getElementById('dlt-back').value = parts[1];
  document.getElementById('dlt-history').value = dltSampleHistory.join('\n');
  // 填充复盘输入框默认值（兼容旧版复盘输入框）
  var sampleFront = parts[0].split(',').slice(0,5).join(',');
  var sampleBack = parts[1].split(',').slice(0,2).join(',');
  var reviewNums = document.getElementById('dlt-review-numbers');
  var reviewBack = document.getElementById('dlt-review-blue');
  if (reviewNums) reviewNums.value = sampleFront;
  if (reviewBack) reviewBack.value = sampleBack;
  // 填充表格输入
  fillDLTInputTable(dltSampleHistory);
  // 渲染历史开奖表格
  renderDLTHistoryTable();
}

function clearDLT() {
  document.getElementById('dlt-front').value = '';
  document.getElementById('dlt-back').value = '';
  document.getElementById('dlt-history').value = '';
  document.getElementById('dlt-results').style.display = 'none';
  document.getElementById('dlt-empty').style.display = 'block';
  document.getElementById('dlt-history-table-wrap').style.display = 'none';
  // 清空表格输入
  var tbody = document.querySelector('#dlt-input-table tbody');
  if (tbody) {
    tbody.innerHTML = '<tr data-row="0"><td style="padding:6px 8px;border:1px solid var(--rule);text-align:center;color:var(--muted)">1</td><td style="padding:6px 8px;border:1px solid var(--rule)"><input type="text" class="dlt-input-front" placeholder="如: 03,15,22,28,35" style="width:100%;border:none;background:transparent;font-size:0.85rem;padding:4px"></td><td style="padding:6px 8px;border:1px solid var(--rule)"><input type="text" class="dlt-input-back" placeholder="如: 04,09" style="width:100%;border:none;background:transparent;font-size:0.85rem;padding:4px;text-align:center"></td><td style="padding:6px 8px;border:1px solid var(--rule);text-align:center"><button type="button" onclick="removeDLTInputRow(this)" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:1rem">&times;</button></td></tr>';
    // 绑定blur事件
    var firstRow = tbody.querySelector('tr');
    if (firstRow) {
      var fi = firstRow.querySelector('.dlt-input-front');
      var bi = firstRow.querySelector('.dlt-input-back');
      if (fi) fi.addEventListener('blur', syncDLTInputToTextarea);
      if (bi) bi.addEventListener('blur', syncDLTInputToTextarea);
    }
  }
}

function analyzeDLT() {
  var frontStr = document.getElementById('dlt-front').value;
  var backStr = document.getElementById('dlt-back').value;
  var historyStr = document.getElementById('dlt-history').value;

  var lastFront = parseNums(frontStr);
  var lastBack = parseNums(backStr);

  if (lastFront.length < 5 || lastBack.length < 2) {
    if (!historyStr.trim()) { alert('请至少输入当期开奖号码'); return; }
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

  // 渲染历史开奖表格
  renderDLTHistoryTable();

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

  try { renderDLTStats(last, history); } catch(e) { console.log('renderDLTStats error:', e.message); }
  try { renderDLTRepeat(last, history); } catch(e) { console.log('renderDLTRepeat error:', e.message); }
  try { renderDLTZone(allFronts); } catch(e) { console.log('renderDLTZone error:', e.message); }
  try { renderDLTSum(allFronts); } catch(e) { console.log('renderDLTSum error:', e.message); }
  try { renderDLTSpan(allFronts); } catch(e) { console.log('renderDLTSpan error:', e.message); }
  try { renderDLTHotCold(allFronts, allBacks); } catch(e) { console.log('renderDLTHotCold error:', e.message); }
  try { renderDLTDanTuo(last, allFronts, allBacks); } catch(e) { console.log('renderDLTDanTuo error:', e.message); }
  try { renderDLTRecommend_V3(last.front.concat(last.back), allFronts, allBacks); } catch(e) { console.log('renderDLTRecommend_V3 error:', e.message); }
  try { renderDLTProbAnalysis(); } catch(e) { console.log('renderDLTProbAnalysis error:', e.message); }
  try { renderDLTDual(); } catch(e) { console.log('renderDLTDual error:', e.message); }

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
  html += '<div class="stat-item"><div class="stat-value">' + frontSum + '</div><div class="stat-label">当期前区和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + frontSpan + '</div><div class="stat-label">当期前区跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + oddCount + ':' + (5 - oddCount) + '</div><div class="stat-label">奇偶比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + bigCount + ':' + (5 - bigCount) + '</div><div class="stat-label">大小比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  // Show last draw balls
  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">当期开奖号码</div>';
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

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">当期号码重号可能性评估</div>';
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
  html += '<div class="result-row"><span class="result-label">当期区间比</span><span class="result-value">' + lastZone.join(' : ') + '</span></div>';

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
  html += '<div class="result-row"><span class="result-label">当期和值</span><span class="result-value">' + lastSum + '</span></div>';
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
  html += '<div class="result-row"><span class="result-label">当期跨度</span><span class="result-value">' + lastSp + '</span></div>';
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

function getDLTAdaptiveWeights() {
  var defaults = {
    wf: 0.11, mpScore: 0.11, tailScore: 0.06, oddAltScore: 0.04,
    sizeScore: 0.03, zoneScore: 0.04, neighborScore: 0.06,
    pairScore: 0.05, stability: 0.03, mkScore: 0.10,
    diagonalScore: 0.07, hotColdAltScore: 0.08,
    crossLotteryScore: 0.06, maScore: 0.04, cycleScore: 0.04,
    coScore: 0.12
  };
  try {
    var saved = localStorage.getItem('dlt_adaptive_weights');
    if (saved) {
      var parsed = JSON.parse(saved);
      for (var k in parsed) {
        if (defaults.hasOwnProperty(k) && typeof parsed[k] === 'number') {
          defaults[k] = parsed[k];
        }
      }
    }
  } catch(e) {}
  return defaults;
}

function scoreDLTNumbers_V3(lastDraw, history, weights) {
  var w = weights || getDLTAdaptiveWeights();
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

    // 移动平均趋势评分
    var ma = movingAverageTrend(n, fronts);
    var maScore = ma.trend === 'up' ? 0.9 : ma.trend === 'warming' ? 0.75 : ma.trend === 'stable' ? 0.6 : 0.4;

    // 周期性分析评分
    var cycle = cycleAnalysis(n, fronts);
    var cycleScore = cycle.score;

    // V4 跨彩种关联：SSQ红区斜连号 → DLT前区加分
    var crossLotteryScore = 0;
    if (typeof ssqSampleHistory !== 'undefined' && ssqSampleHistory.length > 0) {
      var lastSSQ = ssqSampleHistory[0].split('|')[0].split(',').map(Number);
      for (var si = 0; si < lastSSQ.length; si++) {
        var sdiff = Math.abs(n - lastSSQ[si]);
        if (sdiff === 1) { crossLotteryScore = 0.7; break; }
        else if (sdiff === 2) { crossLotteryScore = 0.85; break; }
        else if (sdiff === 3) { crossLotteryScore = 0.65; break; }
        if (n === lastSSQ[si]) { crossLotteryScore = 0.5; }
      }
    }

    scores.push({
      num: n,
      wf: wf, currentGap: currentGap, mp: mp, mpScore: mpScore, mkScore: mkScore,
      tailScore: tailScore, oddAltScore: oddAltScore, sizeScore: sizeScore, zoneScore: zoneScore,
      neighborScore: neighborScore, pairScore: pairScore, stability: stability,
      diagonalScore: diagonalScore, hotColdAltScore: hotColdAltScore,
      crossLotteryScore: crossLotteryScore,
      maScore: maScore, cycleScore: cycleScore,
      // V4权重参数化：支持自适应学习调整
      baseScore: wf*w.wf + mpScore*w.mpScore + tailScore*w.tailScore + oddAltScore*w.oddAltScore + sizeScore*w.sizeScore + zoneScore*w.zoneScore + neighborScore*w.neighborScore + pairScore*w.pairScore + stability*w.stability + mkScore*w.mkScore + diagonalScore*w.diagonalScore + hotColdAltScore*w.hotColdAltScore + crossLotteryScore*w.crossLotteryScore + maScore*w.maScore + cycleScore*w.cycleScore,
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
    s.totalScore = s.baseScore + s.coScore * w.coScore;
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

    // 后区遗漏回补评分
    var lastMissScore = 0;
    if (lastB.indexOf(n) < 0) {
      var missCount = 0;
      for (var mi = 0; mi < backs.length; mi++) {
        if (backs[mi].indexOf(n) >= 0) break;
        missCount++;
      }
      if (missCount >= 3 && missCount <= 8) lastMissScore = 0.8;
      else if (missCount >= 9) lastMissScore = 0.6;
    }

    // 移动平均趋势评分
    var ma = movingAverageTrend(n, backs);
    var maScore = ma.trend === 'up' ? 0.9 : ma.trend === 'warming' ? 0.75 : ma.trend === 'stable' ? 0.6 : 0.4;

    // 周期性分析评分
    var cycle = cycleAnalysis(n, backs);
    var cycleScore = cycle.score;

    // V4权重优化：降低纯频率(14%)，提升遗漏(15%)+回补(8%)+Markov(10%)，总和达90%
    scores.push({num: n, wf: wf, currentGap: currentGap, mp: mp, mpScore: mpScore, mkScore: mkScore, oddScore: oddScore, sizeScore: sizeScore, tailScore: tailScore, consecutiveScore: consecutiveScore, sumTrendScore: sumTrendScore, lastMissScore: lastMissScore, maScore: maScore, cycleScore: cycleScore, totalScore: wf*0.14 + mpScore*0.15 + oddScore*0.08 + sizeScore*0.07 + tailScore*0.07 + mkScore*0.10 + consecutiveScore*0.06 + sumTrendScore*0.05 + lastMissScore*0.08 + maScore*0.05 + cycleScore*0.05});
  }
  return scores.sort(function(a,b){return b.totalScore-a.totalScore;});
}

function dltQualityScore(front, back, ctx) {
  ctx = ctx || {};
  var lastFront = ctx.lastFront || [];
  var frontScoreMap = ctx.frontScoreMap || {};
  var backScoreMap = ctx.backScoreMap || {};
  var existingCombos = ctx.existingCombos || [];
  var lastOddRatio = ctx.lastOddRatio !== undefined ? ctx.lastOddRatio : (lastFront.filter(function(x){return x%2===1;}).length / 5);
  var lastBigRatio = ctx.lastBigRatio !== undefined ? ctx.lastBigRatio : (lastFront.filter(function(x){return x>17;}).length / 5);
  var lastHasPair = ctx.lastHasPair !== undefined ? ctx.lastHasPair : (lastFront.length > 0 ? gapStats(lastFront.slice().sort(function(a,b){return a-b;})).pairs.length >= 1 : false);
  var lastBackSameTail = ctx.lastBackSameTail !== undefined ? ctx.lastBackSameTail : (back.length >= 2 && (back[0] % 10) === (back[1] % 10));

  var s = front.slice().sort(function(a,b){return a-b;});
  var sum = s.reduce(function(a,b){return a+b;},0);
  var span = s[4]-s[0];
  var z1=s.filter(function(x){return x<=12;}).length, z2=s.filter(function(x){return x>12&&x<=23;}).length, z3=s.filter(function(x){return x>23;}).length;
  var odd=s.filter(function(x){return x%2===1;}).length;
  var big=s.filter(function(x){return x>17;}).length;
  var tails = {}; s.forEach(function(n){var t=n%10; tails[t]=(tails[t]||0)+1;});
  var maxTail = Math.max.apply(null, Object.values(tails));
  var g = gapStats(s);

  // V5校准：基础分22，各项分值降低，增加集中度惩罚
  var q = 22;
  if (sum>=65 && sum<=125) q+=6; else if (sum>=55 && sum<=135) q+=3; else if (sum<45 || sum>145) q-=4;
  if (span>=12 && span<=26) q+=6; else if (span>=8 && span<=30) q+=3; else if (span<6 || span>33) q-=2;
  if ((z1>=1&&z1<=3)&&(z2>=1&&z2<=3)&&(z3>=1&&z3<=3)) q+=7;
  else if ((z1>=1&&z1<=3)&&(z2>=1&&z2<=3)) q+=3;
  else if (z1===0||z2===0||z3===0) q-=3;
  if (odd>=2 && odd<=3) q+=6; else if (odd===0||odd===5) q-=4; else if (odd>=1 && odd<=4) q+=2;
  if (big>=2 && big<=3) q+=6; else if (big===0||big===5) q-=4; else if (big>=1 && big<=4) q+=2;
  if (maxTail<=2) q+=6; else if (maxTail<=3) q+=2; else if (maxTail>=4) q-=3;
  if (g.pairs.length===1) q+=5; else if (g.pairs.length===2) q+=2; else if (g.pairs.length===0) q-=1;

  // AC值
  var diffs = [];
  for (var ai=0; ai<s.length-1; ai++) {
    for (var aj=ai+1; aj<s.length; aj++) diffs.push(s[aj]-s[ai]);
  }
  var uniqueDiffs = {};
  diffs.forEach(function(d){ uniqueDiffs[d]=true; });
  var acValue = Object.keys(uniqueDiffs).length;
  if (acValue>=8) q+=4; else if (acValue>=6) q+=2; else if (acValue<=4) q-=2;

  // 斜连号
  var diagonalCount = 0;
  if (lastFront.length > 0) {
    for (var di=0; di<s.length; di++) {
      for (var dj=0; dj<lastFront.length; dj++) {
        var diff = Math.abs(s[di]-lastFront[dj]);
        if (diff===2 || diff===3) { diagonalCount++; break; }
      }
    }
  }
  if (diagonalCount>=2) q+=3; else if (diagonalCount>=1) q+=1;

  // 跨彩种斜连
  var crossLotteryCount = 0;
  if (typeof ssqSampleHistory !== 'undefined' && ssqSampleHistory.length > 0) {
    var lastSSQ = ssqSampleHistory[0].split('|')[0].split(',').map(Number);
    for (var di=0; di<s.length; di++) {
      for (var sj=0; sj<lastSSQ.length; sj++) {
        var cdiff = Math.abs(s[di]-lastSSQ[sj]);
        if (cdiff<=3) { crossLotteryCount++; break; }
      }
    }
  }
  if (crossLotteryCount>=3) q+=4; else if (crossLotteryCount>=2) q+=2; else if (crossLotteryCount>=1) q+=1;

  // 动态回归
  if (lastFront.length > 0) {
    if ((lastOddRatio >= 0.8 && odd <= 2) || (lastOddRatio <= 0.2 && odd >= 3)) q += 2;
    else if ((lastOddRatio >= 0.6 && odd <= 2) || (lastOddRatio <= 0.4 && odd >= 3)) q += 1;
    if ((lastBigRatio >= 0.8 && big <= 2) || (lastBigRatio <= 0.2 && big >= 3)) q += 2;
    else if ((lastBigRatio >= 0.6 && big <= 2) || (lastBigRatio <= 0.4 && big >= 3)) q += 1;
    if (lastHasPair && g.pairs.length >= 1) q += 1;
    if (lastBackSameTail) {
      var backTailSame = (back[0] % 10) === (back[1] % 10);
      if (!backTailSame) q += 2;
    }
    var lastZ1 = lastFront.filter(function(x){return x<=12;}).length;
    var lastZ2 = lastFront.filter(function(x){return x>12&&x<=23;}).length;
    var lastZ3 = lastFront.filter(function(x){return x>23;}).length;
    if (lastZ1 >= 3 && z1 <= 2) q += 1;
    if (lastZ2 >= 3 && z2 <= 2) q += 1;
    if (lastZ3 >= 3 && z3 <= 2) q += 1;
  }

  // 号码集中度惩罚
  if (z1 >= 4 || z2 >= 4 || z3 >= 4) q -= 4;
  if (maxTail >= 3) q -= 3;

  // 与已有方案相似度惩罚
  if (existingCombos.length > 0) {
    for (var ei = 0; ei < existingCombos.length; ei++) {
      var ex = existingCombos[ei];
      var sameFront = 0;
      for (var si = 0; si < s.length; si++) {
        if (ex.front.indexOf(s[si]) >= 0) sameFront++;
      }
      if (sameFront >= 4) q -= 3;
      else if (sameFront >= 3) q -= 1;
    }
  }

  // 模型评分权重降低
  var fScore = s.reduce(function(sum,n){var sc=frontScoreMap[n]; return sum+(sc?sc.totalScore:0);},0);
  var bScore = back.reduce(function(sum,n){var sc=backScoreMap[n]; return sum+(sc?sc.totalScore:0);},0);
  q += Math.min(fScore*2, 8) + Math.min(bScore*3, 5);
  return Math.min(100, Math.round(q));
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

  var qualityScoreCtx = {
    lastFront: lastFront, frontScoreMap: frontScoreMap, backScoreMap: backScoreMap,
    lastOddRatio: lastOddRatio, lastBigRatio: lastBigRatio,
    lastHasPair: lastHasPair, lastBackSameTail: lastBackSameTail,
    existingCombos: []
  };
  function qualityScore(front, back) {
    return dltQualityScore(front, back, qualityScoreCtx);
  }

  function genStrategy1() {
    // 严格约束优化：从Top20遍历，硬约束更严格
    var picks = frontScores.slice(0,20).map(function(s){return s.num;});
    var bp = backScores.slice(0,6).map(function(s){return s.num;});
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
    // 热号+冷号双轨：2热+2温+1冷，后区冷热交替
    var hot = frontScores.slice(0,6).map(function(s){return s.num;});
    var warm = frontScores.slice(6,14).map(function(s){return s.num;});
    var cold = frontScores.filter(function(s){return s.mp>0.5;}).slice(0,8).map(function(s){return s.num;});
    var unique = [];
    // 2个热号
    for (var i=0;i<hot.length && unique.length<2;i++) {
      if (unique.indexOf(hot[i])<0) unique.push(hot[i]);
    }
    // 2个温号
    for (var i=0;i<warm.length && unique.length<4;i++) {
      if (unique.indexOf(warm[i])<0) unique.push(warm[i]);
    }
    // 1个冷号
    for (var i=0;i<cold.length && unique.length<5;i++) {
      if (unique.indexOf(cold[i])<0) unique.push(cold[i]);
    }
    // 补足
    for (var i=0;i<frontScores.length && unique.length<5;i++) {
      if (unique.indexOf(frontScores[i].num)<0) unique.push(frontScores[i].num);
    }
    unique.sort(function(a,b){return a-b;});
    // 后区：1热+1冷交替
    var bHot = backScores[0].num;
    var bCold = backScores.filter(function(s){return s.currentGap>=3;}).slice(-1)[0];
    var b = [bHot, bCold ? bCold.num : backScores[Math.min(3,backScores.length-1)].num];
    b.sort(function(a,b){return a-b;});
    return [unique.concat(b)];
  }

  function genStrategy3() {
    // 跨彩种周期驱动：从mkScore高且跨彩种分高的池选
    var mkPool = frontScores.filter(function(s){return s.mkScore>0.35 || (s.crossLotteryScore||0) >= 0.6;}).map(function(s){return s.num;});
    // 补充一些中位号码增加多样性
    var midPool = frontScores.slice(8,18).map(function(s){return s.num;});
    var pool = [];
    for (var i=0;i<mkPool.length;i++) if (pool.indexOf(mkPool[i])<0) pool.push(mkPool[i]);
    for (var i=0;i<midPool.length && pool.length<20;i++) if (pool.indexOf(midPool[i])<0) pool.push(midPool[i]);
    if (pool.length < 10) {
      for (var i=0;i<frontScores.length && pool.length<20;i++) {
        if (pool.indexOf(frontScores[i].num)<0) pool.push(frontScores[i].num);
      }
    }
    var s1Front = s1[0] ? s1[0].slice(0,5) : [];
    var best = null, bestQ = -1;
    for (var a=0;a<pool.length-4;a++)
    for (var b=a+1;b<pool.length-3;b++)
    for (var c=b+1;c<pool.length-2;c++)
    for (var d=c+1;d<pool.length-1;d++)
    for (var e=d+1;e<pool.length;e++) {
      var f=[pool[a],pool[b],pool[c],pool[d],pool[e]];
      var diffCount = 0;
      for (var k=0;k<f.length;k++) if (s1Front.indexOf(f[k])<0) diffCount++;
      if (diffCount < 2) continue;
      var b2 = [backScores[1].num, backScores[Math.min(4,backScores.length-1)].num];
      var q = qualityScore(f,b2);
      if (q>bestQ) {bestQ=q; best=f.concat(b2);}
    }
    if (!best) {
      for (var a=0;a<pool.length-4;a++)
      for (var b=a+1;b<pool.length-3;b++)
      for (var c=b+1;c<pool.length-2;c++)
      for (var d=c+1;d<pool.length-1;d++)
      for (var e=d+1;e<pool.length;e++) {
        var f=[pool[a],pool[b],pool[c],pool[d],pool[e]];
        var b2 = [backScores[1].num, backScores[Math.min(4,backScores.length-1)].num];
        var q = qualityScore(f,b2);
        if (q>bestQ) {bestQ=q; best=f.concat(b2);}
      }
    }
    return best ? [best] : [];
  }

  function genStrategy4() {
    // 共现聚类+邻号扩展：从共现网络选，引入邻号
    var co = buildCoOccurrence(allFronts);
    var seed = frontScores[0].num;
    var cluster = [seed];
    var neighbors = [];
    // 收集所有邻号候选
    for (var n=1; n<=35; n++) {
      for (var j=0; j<lastFront.length; j++) {
        if (Math.abs(n - lastFront[j]) === 1) {
          if (neighbors.indexOf(n) < 0) neighbors.push(n);
          break;
        }
      }
    }
    // 聚类扩展
    while (cluster.length < 5) {
      var bestN = -1, bestS = -1;
      for (var n = 1; n <= 35; n++) {
        if (cluster.indexOf(n) >= 0) continue;
        var s = 0;
        cluster.forEach(function(c) { s += (co[n] && co[n][c]) || 0; });
        if (s > bestS) { bestS = s; bestN = n; }
      }
      if (bestN > 0) cluster.push(bestN); else break;
    }
    // 如果聚类不足5个，用邻号补充
    for (var i = 0; i < neighbors.length && cluster.length < 5; i++) {
      if (cluster.indexOf(neighbors[i]) < 0) cluster.push(neighbors[i]);
    }
    while (cluster.length < 5) {
      for (var i = 0; i < frontScores.length; i++) {
        if (cluster.indexOf(frontScores[i].num) < 0) {
          cluster.push(frontScores[i].num);
          break;
        }
      }
    }
    var b = [backScores[0].num, backScores[Math.min(5,backScores.length-1)].num];
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

  function genStrategy5() {
    // 区间偏移+尾数分散：强制区间平衡+尾数分散
    var zonePool = [[], [], []];
    for (var zi = 0; zi < frontScores.length; zi++) {
      var n = frontScores[zi].num;
      var idx = n <= 12 ? 0 : n <= 23 ? 1 : 2;
      zonePool[idx].push(n);
    }
    var lastZone = [0, 0, 0];
    lastFront.forEach(function(x){ lastZone[x<=12?0:x<=23?1:2]++; });
    // 优先从偏少区间多选
    var zoneOrder = [0, 1, 2].sort(function(a,b){ return lastZone[a] - lastZone[b]; });
    var picks = [];
    var usedTails = {};
    for (var zi = 0; zi < 3; zi++) {
      var zidx = zoneOrder[zi];
      var need = zi === 0 ? 2 : zi === 1 ? 2 : 1;
      for (var pj = 0; pj < zonePool[zidx].length && picks.length < 5; pj++) {
        var n = zonePool[zidx][pj];
        var tail = n % 10;
        // 尾数分散：同一尾数不超过2个
        if ((usedTails[tail] || 0) >= 2) continue;
        if (picks.indexOf(n) < 0) {
          picks.push(n);
          usedTails[tail] = (usedTails[tail] || 0) + 1;
          need--;
          if (need <= 0) break;
        }
      }
    }
    for (var fi = 0; fi < frontScores.length && picks.length < 5; fi++) {
      if (picks.indexOf(frontScores[fi].num) < 0) picks.push(frontScores[fi].num);
    }
    picks.sort(function(a,b){return a-b;});
    // 后区选遗漏值较大的
    var backByMiss = backScores.slice().sort(function(a,b){return b.currentGap - a.currentGap;});
    var b = [backByMiss[0].num, backByMiss[Math.min(2, backByMiss.length-1)].num];
    b.sort(function(a,b){return a-b;});
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

  var html = '<div class="recommend-container" style="padding:12px"><h3 style="margin-top:0;color:var(--ink)">🎯 V5 增强模型推荐</h3>';
  html += '<p style="color:var(--muted);font-size:12px;margin-bottom:12px">基于加权频率·遗漏百分位·共现矩阵·尾数分散·区间偏移·连号历史·邻号·奇偶回归·大小均衡·稳定性·斜连号·冷热交替·AC值·集中度惩罚 十四维评分体系（含上期特征动态回归）</p>';

  var strategies = [
    {name:'严格约束优化', desc:'从Top20热号中遍历所有组合，通过硬性约束（和值/跨度/区间/奇偶/大小/尾数/连号/AC值/斜连号）筛选最高分', combos:s1},
    {name:'热号+冷号双轨', desc:'2热+2温+1冷，后区冷热交替，实现冷热均衡', combos:s2},
    {name:'共现聚类+邻号扩展', desc:'以Top1为种子聚类扩展，引入上期邻号增加命中概率', combos:s4},
    {name:'区间偏移+尾数分散', desc:'强制区间平衡+尾数分散，后区选大遗漏号码', combos:s5}
  ];

  strategies.forEach(function(st,i){
    html += '<div class="strategy-box" style="margin:12px 0;padding:12px;border:1px solid var(--rule);border-radius:8px;background:var(--bg2)">';
    html += '<h4 style="margin:0 0 6px 0;color:var(--ink)">策略'+(i+1)+'：'+st.name+'</h4>';
    html += '<p style="margin:0 0 8px 0;color:var(--muted);font-size:12px">'+st.desc+'</p>';
    st.combos.forEach(function(c,ci){
      var q = qualityScore(c.slice(0,5), c.slice(5));
      // 标记胆码（评分最高的2个号码）
      var frontNums = c.slice(0,5);
      var scoredNums = frontNums.map(function(n){
        var sc = frontScoreMap[n];
        return {num: n, score: sc ? sc.totalScore : 0};
      }).sort(function(a,b){return b.score - a.score;});
      var danNums = scoredNums.slice(0,2).map(function(x){return x.num;});

      html += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap">';
      html += '<span style="font-weight:bold;color:var(--accent4)">方案'+(ci+1)+'：</span>';
      html += '<span style="font-size:11px;color:var(--muted)">前区</span>';
      frontNums.forEach(function(n){
        var isDan = danNums.indexOf(n) >= 0;
        html += '<div class="ball '+(isDan?'gold':'red')+'" style="width:32px;height:32px;font-size:12px;'+(isDan?'box-shadow:0 0 8px rgba(245,158,11,0.6);':'')+'">'+pad(n)+'</div>';
      });
      html += '<span style="font-size:11px;color:var(--muted);margin-left:4px">后区</span>';
      c.slice(5).forEach(function(n){
        html += '<div class="ball blue" style="width:32px;height:32px;font-size:12px;">'+pad(n)+'</div>';
      });
      html += '<span style="margin-left:auto;background:'+(q>=85?'var(--accent3)':(q>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:12px">质量分 '+q+'</span>';
      html += '</div>';
    });
    html += '</div>';
  });

  html += '<h4 style="margin-top:16px;color:var(--ink)">📊 前区 Top10 号码评分详情</h4>';
  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--bg3)">';
  html += '<th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">号码</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">加权频率</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">当前遗漏</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">遗漏%位</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">转移概率</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">共现分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">跨彩种</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">总评分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">理由</th>';
  html += '</tr></thead><tbody>';
  topFronts.forEach(function(s){
    var reason = [];
    if (s.wf > 0.2) reason.push('高频');
    if (s.mp > 0.8) reason.push('深冷');
    if (s.mkScore > 0.8) reason.push('冷转热');
    if (s.neighborScore > 0.5) reason.push('邻号');
    if (s.coScore > 0.5) reason.push('共现强');
    if (s.crossLotteryScore >= 0.65) reason.push('SSQ斜连');
    else if (s.crossLotteryScore >= 0.5) reason.push('SSQ同下');
    html += '<tr><td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--ink)">'+String(s.num).padStart(2,'0')+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.wf*100).toFixed(1)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+s.currentGap+'期</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mp*100).toFixed(0)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mkScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.coScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.crossLotteryScore ? (s.crossLotteryScore*100).toFixed(0) : 0)+'</td>';
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

  // 多样性评分
  var allFrontCombos = [s1[0].slice(0,5), s2[0].slice(0,5), s3[0].slice(0,5), s4[0].slice(0,5), s5[0].slice(0,5)];
  var diversity = comboDiversityScore(allFrontCombos);
  html += '<div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--accent3)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:4px">🎲 方案多样性评分：'+(diversity*100).toFixed(0)+'%</div>';
  html += '<div style="color:var(--muted);font-size:11px">5个方案前区的差异度，越高表示方案越多样化</div>';
  html += '</div>';

  // 熵值分析
  var ent = entropyAnalysis(allFronts, 35);
  html += '<div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--accent5)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:4px">📈 号码分布熵值：'+(ent.ratio*100).toFixed(1)+'%</div>';
  html += '<div style="color:var(--muted);font-size:11px">'+(ent.ratio > 0.85 ? '近期号码分布均匀，冷热平衡' : ent.ratio > 0.7 ? '分布适中，有轻微集中趋势' : '分布集中，冷热分化明显')+'</div>';
  html += '</div>';

  // 回测结果
  var backtestFunc = function(trainData) {
    var scores = scoreDLTNumbers_V3(trainData[trainData.length-1], trainData.slice(0,-1));
    return scores.slice(0,5).map(function(s){return s.num;});
  };
  var bt = backtestModel(history, null, backtestFunc, 5, 5);
  if (bt.tests > 0) {
    html += '<div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--accent2)">';
    html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:4px">🧪 回测验证（近'+bt.tests+'期）</div>';
    html += '<div style="color:var(--muted);font-size:11px">前区Top5平均命中：'+bt.avgHit.toFixed(2)+'个（命中率 '+bt.avgRate.toFixed(1)+'%）| 最佳：'+bt.bestHit+'个 | 最差：'+bt.worstHit+'个';
    if (bt.hitZeroCount > 0) html += ' | 零命中：'+bt.hitZeroCount+'期';
    html += '</div>';
    // 遗漏号码分析：显示回测中被遗漏最多的号码
    if (bt.missedNumbers && bt.missedNumbers.length > 0) {
      var topMissed = bt.missedNumbers.slice(0, 5);
      html += '<div style="margin-top:6px;padding:6px 8px;background:rgba(239,68,68,0.08);border-radius:6px">';
      html += '<div style="color:var(--ink);font-size:11px;font-weight:bold;margin-bottom:3px">⚠️ 高频遗漏号码（模型盲区）</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      topMissed.forEach(function(m) {
        html += '<span style="background:rgba(239,68,68,0.15);color:var(--accent2);padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600">' + pad(m.num) + '<span style="color:var(--muted);margin-left:2px">×'+m.count+'</span></span>';
      });
      html += '</div>';
      html += '<div style="color:var(--muted);font-size:10px;margin-top:3px">这些号码频繁出现但模型未能识别，建议关注遗漏权重</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  html += '</div>';

  document.getElementById('dlt-recommend').innerHTML = html;

  // 保存当前推荐到 localStorage，供次日回测直接使用（避免重新计算导致号码不一致）
  try {
    var newLastDraw = last.join(',');
    var currentSaved = localStorage.getItem('dlt_recommendations');
    if (currentSaved) {
      var currentParsed = JSON.parse(currentSaved);
      if (currentParsed.lastDraw !== newLastDraw) {
        localStorage.setItem('dlt_previous_recommendations', currentSaved);
      }
    }
    var recsData = {
      date: new Date().toISOString().split('T')[0],
      lastDraw: newLastDraw,
      recommendations: strategies
    };
    localStorage.setItem('dlt_recommendations', JSON.stringify(recsData));
  } catch(e) {
    console.log('保存DLT推荐失败:', e.message);
  }
}


// ==================== 双色球分析 ====================

var SSQ_ZONES = [[1,11],[12,22],[23,33]];

var ssqSampleHistory = [
  '01,04,05,14,18,25|04',
  '01,03,19,20,24,25|07',
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
  // 填充复盘输入框默认值（兼容旧版复盘输入框）
  var sampleRed = parts[0].split(',').slice(0,6).join(',');
  var reviewNums = document.getElementById('ssq-review-numbers');
  var reviewBlue = document.getElementById('ssq-review-blue');
  if (reviewNums) reviewNums.value = sampleRed;
  if (reviewBlue) reviewBlue.value = parts[1];
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

  try { renderSSQStats(last, history); } catch(e) { console.log('renderSSQStats error:', e.message); }
  try { renderSSQRepeat(last, history); } catch(e) { console.log('renderSSQRepeat error:', e.message); }
  try { renderSSQZone(allReds); } catch(e) { console.log('renderSSQZone error:', e.message); }
  try { renderSSQSum(allReds); } catch(e) { console.log('renderSSQSum error:', e.message); }
  try { renderSSQSpan(allReds); } catch(e) { console.log('renderSSQSpan error:', e.message); }
  try { renderSSQHotCold(allReds, allBlues); } catch(e) { console.log('renderSSQHotCold error:', e.message); }
  try { renderSSQBlueTrend(allBlues); } catch(e) { console.log('renderSSQBlueTrend error:', e.message); }
  try { renderSSQOddEven(allReds, allBlues); } catch(e) { console.log('renderSSQOddEven error:', e.message); }
  try { renderSSQBlueMiss(allBlues); } catch(e) { console.log('renderSSQBlueMiss error:', e.message); }
  try { renderSSQTail(allReds); } catch(e) { console.log('renderSSQTail error:', e.message); }
  try { renderSSQDanTuo(last, allReds, allBlues); } catch(e) { console.log('renderSSQDanTuo error:', e.message); }
  try { renderSSQRecommend(last, allReds, allBlues); } catch(e) { console.log('renderSSQRecommend error:', e.message); }
  try { renderSSQProbAnalysis(); } catch(e) { console.log('renderSSQProbAnalysis error:', e.message); }
  try { renderSSQDual(); } catch(e) { console.log('renderSSQDual error:', e.message); }

  document.getElementById('ssq-results').scrollIntoView({ behavior: 'smooth' });
}

function renderSSQStats(last, history) {
  var redSum = sum(last.red);
  var redSpan = span(last.red);
  var oddCount = last.red.filter(function(n) { return n % 2 === 1; }).length;
  var bigCount = last.red.filter(function(n) { return n > 16; }).length;
  var sums = history.map(function(h) { return sum(h.red); });

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + redSum + '</div><div class="stat-label">当期红球和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + redSpan + '</div><div class="stat-label">当期红球跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + oddCount + ':' + (6 - oddCount) + '</div><div class="stat-label">奇偶比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + bigCount + ':' + (6 - bigCount) + '</div><div class="stat-label">大小比</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">当期开奖号码</div>';
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

  html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">当期号码重号可能性评估</div>';
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
  html += '<div class="result-row"><span class="result-label">当期区间比</span><span class="result-value">' + zoneCounts[0].join(' : ') + '</span></div>';

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
  html += '<div class="result-row"><span class="result-label">当期和值</span><span class="result-value">' + lastSum + '</span></div>';
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
  html += '<div class="result-row"><span class="result-label">当期跨度</span><span class="result-value">' + lastSp + '</span></div>';
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

function getSSQAdaptiveWeights() {
  var defaults = {
    wf: 0.16, mpScore: 0.14, mkScore: 0.11, zoneScore: 0.09,
    tailScore: 0.07, oddAltScore: 0.04, sizeScore: 0.04,
    neighborScore: 0.07, pairScore: 0.05, hcScore: 0.07,
    stability: 0.04, maScore: 0.04, cycleScore: 0.04,
    coScore: 0.15
  };
  try {
    var saved = localStorage.getItem('ssq_adaptive_weights');
    if (saved) {
      var parsed = JSON.parse(saved);
      for (var k in parsed) {
        if (defaults.hasOwnProperty(k) && typeof parsed[k] === 'number') {
          defaults[k] = parsed[k];
        }
      }
    }
  } catch(e) {}
  return defaults;
}

function scoreSSQNumbers(last, allReds, weights) {
  var w = weights || getSSQAdaptiveWeights();
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

    // 跨彩种（大乐透）斜连评分
    var crossLotteryScore = 0;
    if (typeof dltSampleHistory !== 'undefined' && dltSampleHistory.length > 0) {
      var lastDLT = dltSampleHistory[0].split('|')[0].split(',').map(Number);
      for (var i = 0; i < lastDLT.length; i++) {
        var diff = Math.abs(n - lastDLT[i]);
        if (diff === 1) { crossLotteryScore = 0.9; break; }
        else if (diff === 2 && crossLotteryScore < 0.7) { crossLotteryScore = 0.7; }
        else if (diff === 3 && crossLotteryScore < 0.4) { crossLotteryScore = 0.4; }
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

    // 移动平均趋势评分
    var ma = movingAverageTrend(n, allReds);
    var maScore = ma.trend === 'up' ? 0.9 : ma.trend === 'warming' ? 0.75 : ma.trend === 'stable' ? 0.6 : 0.4;

    // 周期性分析评分
    var cycle = cycleAnalysis(n, allReds);
    var cycleScore = cycle.score;

    var baseScore = wf*w.wf + mpScore*w.mpScore + mkScore*w.mkScore + zoneScore*w.zoneScore + tailScore*w.tailScore + oddAltScore*w.oddAltScore + sizeScore*w.sizeScore + neighborScore*w.neighborScore + pairScore*w.pairScore + hcScore*w.hcScore + stability*w.stability + maScore*w.maScore + cycleScore*w.cycleScore + crossLotteryScore*0.05;

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
    if (ma.trend === 'up') reasons.push('趋势升');
    if (cycleScore > 0.85) reasons.push('周期到');

    scores.push({ num: n, wf: wf, currentGap: dist.currentGap, mp: mp, mkScore: mkScore, zoneScore: zoneScore, tailScore: tailScore, oddAltScore: oddAltScore, sizeScore: sizeScore, neighborScore: neighborScore, pairScore: pairScore, hcScore: hcScore, stability: stability, maScore: maScore, cycleScore: cycleScore, crossLotteryScore: crossLotteryScore, baseScore: baseScore, coScore: 0, totalScore: baseScore, reasons: reasons });
  }
  var top10 = scores.slice().sort(function(a,b){return b.baseScore-a.baseScore;}).slice(0,10).map(function(s){return s.num;});
  scores.forEach(function(s){
    var coSum = 0, coCount = 0;
    top10.forEach(function(t){
      if (t !== s.num && co[s.num] && co[s.num][t]) { coSum += co[s.num][t]; coCount++; }
    });
    s.coScore = coCount ? Math.min(coSum/coCount/3, 1) : 0;
    s.totalScore = s.baseScore + s.coScore * w.coScore;
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

    // 移动平均趋势评分
    var ma = movingAverageTrend(n, blueHistory);
    var maScore = ma.trend === 'up' ? 0.9 : ma.trend === 'warming' ? 0.75 : ma.trend === 'stable' ? 0.6 : 0.4;

    // 周期性分析评分
    var cycle = cycleAnalysis(n, blueHistory);
    var cycleScore = cycle.score;

    var totalScore = wf * 0.25 + mpScore * 0.20 + mkScore * 0.11 + oddScore * 0.11 + sizeScore * 0.11 + tailScore * 0.09 + maScore * 0.04 + cycleScore * 0.04;

    var reasons = [];
    if (wf > 0.2) reasons.push('高频');
    if (mp > 0.8) reasons.push('深冷');
    if (mkScore > 0.8) reasons.push('冷转热');
    if (oddScore > 0.7) reasons.push('奇偶');
    if (sizeScore > 0.7) reasons.push('大小');
    if (tailScore > 0.7) reasons.push('尾数');
    if (ma.trend === 'up') reasons.push('趋势升');
    if (cycleScore > 0.85) reasons.push('周期到');

    scores.push({ num: n, wf: wf, currentGap: dist.currentGap, mp: mp, mkScore: mkScore, oddScore: oddScore, sizeScore: sizeScore, tailScore: tailScore, maScore: maScore, cycleScore: cycleScore, totalScore: totalScore, reasons: reasons });
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
    {name:'热号+遗漏双轨', desc:'前4球从Top8热号抽取，后2球从遗漏百分位>70%的冷号补充', combos:s2}
  ];

  var html = '<div class="recommend-container" style="padding:12px"><h3 style="margin-top:0;color:var(--ink)">🎯 V2 严谨模型推荐</h3>';
  html += '<p style="color:var(--muted);font-size:12px;margin-bottom:12px">基于加权频率·遗漏百分位·区间回补·尾数分散·奇偶回归·大小均衡·邻号·连号历史·冷热交替·共现矩阵·稳定性 十一维评分体系（含上期特征动态回归）</p>';

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

  // 多样性评分
  var allRedCombos = [s1[0].reds, s2[0].reds, s3[0].reds];
  var diversity = comboDiversityScore(allRedCombos);
  html += '<div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--accent3)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:4px">🎲 方案多样性评分：'+(diversity*100).toFixed(0)+'%</div>';
  html += '<div style="color:var(--muted);font-size:11px">3个方案红球的差异度，越高表示方案越多样化</div>';
  html += '</div>';

  // 熵值分析
  var ent = entropyAnalysis(allReds, 33);
  html += '<div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--accent5)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:4px">📈 号码分布熵值：'+(ent.ratio*100).toFixed(1)+'%</div>';
  html += '<div style="color:var(--muted);font-size:11px">'+(ent.ratio > 0.85 ? '近期号码分布均匀，冷热平衡' : ent.ratio > 0.7 ? '分布适中，有轻微集中趋势' : '分布集中，冷热分化明显')+'</div>';
  html += '</div>';

  // 回测结果
  var backtestFunc = function(trainData) {
    var scores = scoreSSQNumbers({red: trainData[trainData.length-1]}, trainData.slice(0,-1));
    return scores.slice(0,6).map(function(s){return s.num;});
  };
  var bt = backtestModel(allReds, null, backtestFunc, 6, 6);
  if (bt.tests > 0) {
    html += '<div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--accent2)">';
    html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:4px">🧪 回测验证（近'+bt.tests+'期）</div>';
    html += '<div style="color:var(--muted);font-size:11px">红球Top6平均命中：'+bt.avgHit.toFixed(2)+'个（命中率 '+bt.avgRate.toFixed(1)+'%）| 最佳：'+bt.bestHit+'个 | 最差：'+bt.worstHit+'个';
    if (bt.hitZeroCount > 0) html += ' | 零命中：'+bt.hitZeroCount+'期';
    html += '</div>';
    // 遗漏号码分析
    if (bt.missedNumbers && bt.missedNumbers.length > 0) {
      var topMissed = bt.missedNumbers.slice(0, 5);
      html += '<div style="margin-top:6px;padding:6px 8px;background:rgba(239,68,68,0.08);border-radius:6px">';
      html += '<div style="color:var(--ink);font-size:11px;font-weight:bold;margin-bottom:3px">⚠️ 高频遗漏号码（模型盲区）</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      topMissed.forEach(function(m) {
        html += '<span style="background:rgba(239,68,68,0.15);color:var(--accent2);padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600">' + pad(m.num) + '<span style="color:var(--muted);margin-left:2px">×'+m.count+'</span></span>';
      });
      html += '</div>';
      html += '<div style="color:var(--muted);font-size:10px;margin-top:3px">这些号码频繁出现但模型未能识别，建议关注遗漏权重</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  html += '<div class="disclaimer" style="margin-top:1.5rem"><strong>声明：</strong>以上推荐号码基于历史数据统计分析生成，仅供娱乐参考。彩票开奖为随机事件，不构成任何投注建议。</div>';
  html += '</div>';

  document.getElementById('ssq-recommend').innerHTML = html;

  // 保存当前推荐到 localStorage，供下期回测直接使用（避免重新计算导致号码不一致）
  try {
    var newLastDraw = last.red.join(',') + '|' + last.blue;
    var currentSaved = localStorage.getItem('ssq_recommendations');
    if (currentSaved) {
      var currentParsed = JSON.parse(currentSaved);
      if (currentParsed.lastDraw !== newLastDraw) {
        localStorage.setItem('ssq_previous_recommendations', currentSaved);
      }
    }
    var recsData = {
      date: new Date().toISOString().split('T')[0],
      lastDraw: newLastDraw,
      recommendations: strategies
    };
    localStorage.setItem('ssq_recommendations', JSON.stringify(recsData));
  } catch(e) {
    console.log('保存SSQ推荐失败:', e.message);
  }
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

  html += '<div class="result-row"><span class="result-label">当期蓝球</span><span class="result-value hl-blue">' + pad(allBlues[0]) + '</span></div>';
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

  html += '<div class="result-row"><span class="result-label">当期奇偶比</span><span class="result-value">' + oddEvenRatios[0].odd + ':' + oddEvenRatios[0].even + '</span></div>';
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

  html += '<div class="result-row"><span class="result-label">当期连号对数</span><span class="result-value">' + consecCounts[0] + ' 对</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均连号</span><span class="result-value">' + avgConsec + ' 对</span></div>';

  // Find consecutive pairs in last draw
  var lastSorted = allReds[0].slice().sort(function(a,b){return a-b});
  var pairs = [];
  for (var j = 1; j < lastSorted.length; j++) {
    if (lastSorted[j] - lastSorted[j-1] === 1) {
      pairs.push(pad(lastSorted[j-1]) + '-' + pad(lastSorted[j]));
    }
  }
  html += '<div class="result-row"><span class="result-label">当期连号</span><span class="result-value">' + (pairs.length > 0 ? pairs.join(', ') : '无') + '</span></div>';

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
  html += '<div class="result-row"><span class="result-label">当期尾数</span><span class="result-value">';
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
  '05,10,12,19,20,26,27,30,35,38,44,45,46,47,49,54,56,61,72,77',
  '11,15,16,20,33,35,37,39,42,46,49,50,54,56,61,62,71,73,76,79',
  '07,08,14,21,22,26,29,33,36,39,40,57,59,63,64,67,70,72,73,76',
  '09,15,16,21,27,32,33,34,36,38,39,44,45,54,60,67,77,78,79,80',
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
  var reviewNums = document.getElementById('kl8-review-numbers');
  if (reviewNums) reviewNums.value = last;
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
    if (nums.length >= 10) {
      history.push(nums.slice(0, 20).sort(function(a,b){return a-b}));
    }
  }

  if (history.length === 0 && lastNums.length >= 10) {
    history.unshift(lastNums.slice(0, 20).sort(function(a,b){return a-b}));
  }

  if (history.length < 2) { alert('请至少输入2期历史数据'); return; }

  var last = history[0];

  // 先用当期开奖号码验证之前保存的预测（验证的是基于上一期数据生成的预测）
  if (typeof verifyKL8Predictions === 'function') {
    try { verifyKL8Predictions(last); } catch(e) { console.log('verifyKL8Predictions error:', e.message); }
  }

  document.getElementById('kl8-empty').style.display = 'none';
  document.getElementById('kl8-results').style.display = 'block';

  try { renderKL8Stats(last, history); } catch(e) { console.log('renderKL8Stats error:', e.message); }
  try { renderKL8Repeat(last, history); } catch(e) { console.log('renderKL8Repeat error:', e.message); }
  try { renderKL8Zone(history); } catch(e) { console.log('renderKL8Zone error:', e.message); }
  try { renderKL8Sum(history); } catch(e) { console.log('renderKL8Sum error:', e.message); }
  try { renderKL8Span(history); } catch(e) { console.log('renderKL8Span error:', e.message); }
  try { renderKL8HotCold(history); } catch(e) { console.log('renderKL8HotCold error:', e.message); }
  try { renderKL8OddEven(history); } catch(e) { console.log('renderKL8OddEven error:', e.message); }
  try { renderKL8Tail(history); } catch(e) { console.log('renderKL8Tail error:', e.message); }
  try { renderKL8Consecutive(history); } catch(e) { console.log('renderKL8Consecutive error:', e.message); }
  try { renderKL8AC(history); } catch(e) { console.log('renderKL8AC error:', e.message); }
  try { renderKL8DanTuo(last, history, 5, 'kl8-dantuo-5'); } catch(e) { console.log('renderKL8DanTuo 5 error:', e.message); }
  try { renderKL8DanTuo(last, history, 10, 'kl8-dantuo-10'); } catch(e) { console.log('renderKL8DanTuo 10 error:', e.message); }
  try { renderKL8AllPlayTypes_V2(last, history); } catch(e) { console.log('renderKL8AllPlayTypes_V2 error:', e.message); }
  try { renderKL8ProbAnalysis(); } catch(e) { console.log('renderKL8ProbAnalysis error:', e.message); }

  document.getElementById('kl8-results').scrollIntoView({ behavior: 'smooth' });
}

function renderKL8Stats(last, history) {
  var s = sum(last);
  var sp = span(last);
  var sums = history.map(function(h) { return sum(h); });

  var html = '<div class="stat-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + s + '</div><div class="stat-label">当期和值</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + sp + '</div><div class="stat-label">当期跨度</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + history.length + '</div><div class="stat-label">分析期数</div></div>';
  html += '<div class="stat-item"><div class="stat-value">' + Math.round(avg(sums)) + '</div><div class="stat-label">历史均和值</div></div>';
  html += '</div>';

  html += '<div style="margin-top:1rem">';
  html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem">当期开奖号码</div>';
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
  html += '<div class="result-row"><span class="result-label">当期区间分布</span><span class="result-value">' + zoneCounts[0].join(' : ') + '</span></div>';

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
  html += '<div class="result-row"><span class="result-label">当期和值</span><span class="result-value">' + lastSum + '</span></div>';
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
  html += '<div class="result-row"><span class="result-label">当期跨度</span><span class="result-value">' + lastSp + '</span></div>';
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

function renderKL8DanTuo(last, history, playType, targetId) {
  var scores = scoreKL8Numbers(last, history);
  scores.sort(function(a, b) { return b.totalScore - a.totalScore; });

  // 过滤超出1-80范围的号码
  scores = scores.filter(function(s){ return s.num >= 1 && s.num <= 80; });

  var danCount = Math.min(3, Math.floor(playType / 2));
  var tuoCount = Math.min(10, playType + 5);

  // 限制重号总数不超过5个，且胆码最多2个重号：优先选非重号高分号码
  var lastSet = {};
  last.forEach(function(n){ lastSet[n] = true; });
  var repeatCount = 0;
  var maxRepeat = 5;
  var maxDanRepeat = 2;
  var danCandidates = [];
  var tuoCandidates = [];

  // 先尝试选danCount个胆码，控制重号（胆码最多2个重号）
  for (var i = 0; i < scores.length && danCandidates.length < danCount; i++) {
    var n = scores[i].num;
    var isRepeat = lastSet[n];
    if (isRepeat && (repeatCount >= maxRepeat || danCandidates.filter(function(c){ return lastSet[c.num]; }).length >= maxDanRepeat)) continue;
    danCandidates.push(scores[i]);
    if (isRepeat) repeatCount++;
  }

  // 再选拖码，继续控制重号总数（整体不超过5个）
  for (var i = 0; i < scores.length && tuoCandidates.length < tuoCount; i++) {
    var n = scores[i].num;
    var isDan = danCandidates.some(function(c){ return c.num === n; });
    if (isDan) continue;
    var isRepeat = lastSet[n];
    if (isRepeat && repeatCount >= maxRepeat) continue;
    tuoCandidates.push(scores[i]);
    if (isRepeat) repeatCount++;
  }

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
  document.getElementById(targetId || 'kl8-dantuo').innerHTML = html;
}

function getKL8AdaptiveWeights() {
  var defaults = {
    wf: 0.09, mpScore: 0.13, mkScore: 0.10, zoneScore: 0.12,
    neighborScore: 0.10, oddEvenScore: 0.07, bigSmallScore: 0.07,
    lastMissScore: 0.14, tailScore: 0.06, stability: 0.03,
    consecutiveScore: 0.05, maScore: 0.03, cycleScore: 0.05,
    heatDecay: 0.04, sumRegression: 0.03
  };
  try {
    var saved = localStorage.getItem('kl8_adaptive_weights_v2');
    if (saved) {
      var parsed = JSON.parse(saved);
      for (var k in parsed) {
        if (defaults.hasOwnProperty(k) && typeof parsed[k] === 'number') {
          defaults[k] = parsed[k];
        }
      }
    }
  } catch(e) {}
  return defaults;
}

function scoreKL8Numbers(last, history, weights) {
  var w = weights || getKL8AdaptiveWeights();
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
    // 动态区间偏态回补：基于上期区间分布自动判断
    var lastZoneCounts = [0, 0, 0, 0];
    last.forEach(function(x){ lastZoneCounts[x<=20?0:x<=40?1:x<=60?2:3]++; });
    var maxZoneIdx = lastZoneCounts.indexOf(Math.max.apply(null, lastZoneCounts));
    var minZoneIdx = lastZoneCounts.indexOf(Math.min.apply(null, lastZoneCounts));
    if (zoneIdx === minZoneIdx && lastZoneCounts[maxZoneIdx] - lastZoneCounts[zoneIdx] >= 3) { zoneScore += 0.15; }
    else if (zoneIdx === maxZoneIdx && lastZoneCounts[zoneIdx] >= 7) { zoneScore -= 0.10; }

    // 连续两期区间偏态追踪：若某区间连续两期都>=7，额外降温
    if (history.length > 1) {
      var prevZoneCounts = [0, 0, 0, 0];
      history[1].forEach(function(x){ prevZoneCounts[x<=20?0:x<=40?1:x<=60?2:3]++; });
      if (lastZoneCounts[zoneIdx] >= 7 && prevZoneCounts[zoneIdx] >= 7) { zoneScore -= 0.12; }
      // 连续两期某区间<=3，额外升温
      if (lastZoneCounts[zoneIdx] <= 3 && prevZoneCounts[zoneIdx] <= 3) { zoneScore += 0.12; }
    }

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
    // 动态奇偶偏态回补（替代硬编码）
    var lastOddCount = last.filter(function(x){return x%2===1;}).length;
    if (lastOddCount >= 12 && !odd) { oddEvenScore += 0.12; }
    else if (lastOddCount <= 8 && odd) { oddEvenScore += 0.12; }
    // 连续两期完美均衡(10:10)后，下期倾向偏态，给奇偶都加分（打破均衡）
    if (history.length > 1) {
      var prevOddCount = history[1].filter(function(x){return x%2===1;}).length;
      if (lastOddCount === 10 && prevOddCount === 10) { oddEvenScore += 0.08; }
    }

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
    // 上期尾数偏态回补（动态）：上期某尾数>=3次则降温，=0次则升温
    var lastTails = {};
    last.forEach(function(x){ lastTails[x%10] = (lastTails[x%10]||0) + 1; });
    if (lastTails[tail] >= 3) { tailScore -= 0.15; }
    else if (lastTails[tail] === 0) { tailScore += 0.10; }
    // 连续两期尾数升温追踪：若近2期同一尾数都>=2次则额外降温
    var prevTails = {};
    if (history.length > 1) {
      history[1].forEach(function(x){ prevTails[x%10] = (prevTails[x%10]||0) + 1; });
      if (lastTails[tail] >= 2 && prevTails[tail] >= 2) { tailScore -= 0.10; }
    }

    var neighborScore = 0;
    if (last.indexOf(n) >= 0) neighborScore = 0.9;
    else {
      for (var i = 0; i < last.length; i++) {
        if (Math.abs(n - last[i]) === 1) { neighborScore = 0.7; break; }
      }
    }
    // 重号历史频率优化：计算近5期平均重号数，若偏高则上期号码额外加分
    var repeatHistory = [];
    for (var ri = 0; ri < Math.min(5, history.length - 1); ri++) {
      repeatHistory.push(history[ri].filter(function(x){ return history[ri+1].indexOf(x) >= 0; }).length);
    }
    var avgRepeat = kl8Avg(repeatHistory);
    if (avgRepeat >= 3 && last.indexOf(n) >= 0) { neighborScore += 0.08; }

    // 连续重号追踪：连续2期出现额外+0.10，连续3期额外再+0.08
    if (history.length > 1 && last.indexOf(n) >= 0 && history[1].indexOf(n) >= 0) {
      neighborScore += 0.10;
      if (history.length > 2 && history[2].indexOf(n) >= 0) neighborScore += 0.08;
    }

    // KL8连号历史频率评分（增强：近5期连号趋势）
    var consecutiveScore = pairHistoryScore(n, history);
    // 如果连号趋势强（近5期平均连号组数>=2），提升连号评分权重
    var pairTrend = 0;
    for (var pi = 0; pi < Math.min(5, history.length); pi++) {
      var s = history[pi].slice().sort(function(a,b){return a-b;});
      var pairs = 0;
      for (var pj = 1; pj < s.length; pj++) if (s[pj] - s[pj-1] === 1) pairs++;
      pairTrend += pairs;
    }
    if (pairTrend / Math.min(5, history.length) >= 2) { consecutiveScore += 0.06; }

    var stability = 1 - Math.abs(wf - 0.25) * 3;

    // 移动平均趋势评分
    var ma = movingAverageTrend(n, history);
    var maScore = ma.trend === 'up' ? 0.9 : ma.trend === 'warming' ? 0.75 : ma.trend === 'stable' ? 0.6 : 0.4;

    // 周期性分析评分
    var cycle = cycleAnalysis(n, history);
    var cycleScore = cycle.score;

    // 上期遗漏回补评分：精细分级，遗漏3-8期最优回补窗口
    var lastMissScore = 0;
    var lastMiss = 0;
    if (last.indexOf(n) < 0) {
      for (var mi = 0; mi < history.length; mi++) {
        if (history[mi].indexOf(n) >= 0) break;
        lastMiss++;
      }
      if (lastMiss >= 3 && lastMiss <= 5) lastMissScore = 0.95;
      else if (lastMiss >= 6 && lastMiss <= 8) lastMissScore = 0.85;
      else if (lastMiss >= 9 && lastMiss <= 12) lastMissScore = 0.70;
      else if (lastMiss >= 13 && lastMiss <= 18) lastMissScore = 0.55;
      else if (lastMiss >= 19 && lastMiss <= 25) lastMissScore = 0.40;
    }

    // 热号衰减：连续2-3期出现的热号降低评分（防止过度追捧）
    var heatDecay = 0;
    var recentAppear = 0;
    for (var hi = 0; hi < Math.min(3, history.length); hi++) {
      if (history[hi].indexOf(n) >= 0) recentAppear++;
    }
    if (recentAppear >= 3) heatDecay = -0.25;
    else if (recentAppear >= 2) heatDecay = -0.12;
    else if (recentAppear === 0 && wf > 0.20) heatDecay = 0.08; // 隔期热号回升

    // 和值回归信号：计算历史平均和值，号码对回归的贡献
    var sumRegression = 0;
    if (history.length >= 5) {
      var allSums = history.map(function(h){ return sum(h); });
      var avgSum = avg(allSums);
      var lastSum = sum(last);
      var diff = lastSum - avgSum;
      // 如果和值偏高，小号区号码加分；偏低则大号区加分
      if (diff > 40 && n <= 30) sumRegression = 0.20;
      else if (diff > 20 && n <= 35) sumRegression = 0.10;
      else if (diff < -40 && n >= 51) sumRegression = 0.20;
      else if (diff < -20 && n >= 46) sumRegression = 0.10;
    }

    // V4权重参数化：支持自适应学习调整
    var totalScore = wf*w.wf + mpScore*w.mpScore + mkScore*w.mkScore + zoneScore*w.zoneScore + neighborScore*w.neighborScore + oddEvenScore*w.oddEvenScore + bigSmallScore*w.bigSmallScore + lastMissScore*w.lastMissScore + tailScore*w.tailScore + stability*w.stability + consecutiveScore*w.consecutiveScore + maScore*w.maScore + cycleScore*w.cycleScore + heatDecay*w.heatDecay + sumRegression*w.sumRegression;

    var reasons = [];
    if (wf > 0.25) reasons.push('高频');
    if (mp > 0.8) reasons.push('深冷');
    if (mkScore > 0.8) reasons.push('冷转热');
    if (zoneScore > 0.7) reasons.push('区间');
    if (neighborScore > 0.9) reasons.push('重号');
    else if (neighborScore > 0.7) reasons.push('邻号');
    if (lastMissScore > 0.6) reasons.push('遗漏回补');
    if (oddEvenScore > 0.7) reasons.push('奇偶');
    if (bigSmallScore > 0.7) reasons.push('大小');
    if (tailScore > 0.7) reasons.push('尾数');
    if (consecutiveScore > 0.5) reasons.push('连号');
    if (stability > 0.7) reasons.push('稳定');
    if (ma.trend === 'up') reasons.push('趋势升');
    if (cycleScore > 0.85) reasons.push('周期到');
    if (heatDecay < -0.1) reasons.push('热号降温');
    else if (heatDecay > 0) reasons.push('隔期回升');
    if (sumRegression > 0.1) reasons.push('和值回归');

    scores.push({ num: n, wf: wf, currentGap: dist.currentGap, mp: mp, mkScore: mkScore, zoneScore: zoneScore, oddEvenScore: oddEvenScore, bigSmallScore: bigSmallScore, tailScore: tailScore, neighborScore: neighborScore, lastMissScore: lastMissScore, stability: stability, maScore: maScore, cycleScore: cycleScore, heatDecay: heatDecay, sumRegression: sumRegression, totalScore: totalScore, reasons: reasons });
  }
  return scores.sort(function(a, b) { return b.totalScore - a.totalScore; });
}

/**
 * 快乐八自动复盘：对最近3期回溯测试，对比推荐与实际开奖
 * 返回复盘报告HTML和各维度偏差分析
 */
function runKL8AutoReview(history) {
  var testCount = Math.min(2, history.length - 1);
  if (testCount < 1) return { html: '', insights: [] };

  var playTypes = [5, 6, 7, 8, 9, 10];
  var playTypeNames = {5:'五', 6:'六', 7:'七', 8:'八', 9:'九', 10:'十'};

  var results = [];
  for (var t = 0; t < testCount; t++) {
    var actualIdx = history.length - testCount + t;
    var trainData = history.slice(0, actualIdx);
    var actual = history[actualIdx];
    var lastTrain = trainData[trainData.length - 1];

    var scores = scoreKL8Numbers(lastTrain, trainData.slice(0, -1));

    // 按玩法生成各方案推荐
    var ptResults = {};
    for (var pi = 0; pi < playTypes.length; pi++) {
      var pt = playTypes[pi];

      // 方案1：区间均衡+热号
      var s1 = scores.slice(0, pt).map(function(s){ return s.num; });

      // 方案2：冷号优先
      var cold = scores.slice().sort(function(a,b){return b.mp - a.mp;}).slice(0, pt).map(function(s){return s.num;});
      var hot = scores.slice(0, Math.ceil(pt*0.4)).map(function(s){return s.num;});
      var rec2raw = cold.slice(0, Math.ceil(pt*0.6)).concat(hot.filter(function(n){return cold.indexOf(n)<0;}).slice(0, Math.floor(pt*0.4)));
      var s2 = [];
      for (var i2=0; i2<rec2raw.length && s2.length<pt; i2++) if (s2.indexOf(rec2raw[i2])<0) s2.push(rec2raw[i2]);
      for (var j2=0; j2<scores.length && s2.length<pt; j2++) if (s2.indexOf(scores[j2].num)<0) s2.push(scores[j2].num);

      // 方案3：尾数分散
      var tailUsed = {};
      var s3 = [];
      for (var i3 = 0; i3 < scores.length && s3.length < pt; i3++) {
        var n3 = scores[i3].num;
        var t3 = n3 % 10;
        if (!tailUsed[t3] || s3.length >= pt - 2) { s3.push(n3); tailUsed[t3] = true; }
      }

      // 方案4：重号优选（仅选真正的重号，最多5个，剩余排除重号）
      var maxRepeat4 = Math.min(3, Math.floor(pt * 0.25));
      var s4 = scores.filter(function(s){ return lastTrain.indexOf(s.num) >= 0; }).slice(0, maxRepeat4).map(function(s){ return s.num; });
      for (var i4 = 0; i4 < scores.length && s4.length < pt; i4++) {
        var n4 = scores[i4].num;
        if (s4.indexOf(n4) < 0 && lastTrain.indexOf(n4) < 0) s4.push(n4);
      }

      ptResults[pt] = {
        s1: s1, s2: s2, s3: s3, s4: s4
      };
    }

    function hitCount(rec, actual) {
      return rec.filter(function(n){ return actual.indexOf(n) >= 0; }).length;
    }

    results.push({
      period: '第' + (actualIdx + 1) + '期（模拟）',
      actual: actual,
      ptResults: ptResults,
      hitCount: hitCount,
      top10: scores.slice(0, 10).map(function(s){ return s.num; })
    });
  }

  // 计算各玩法各策略平均命中
  var avgHits = {};
  for (var pi = 0; pi < playTypes.length; pi++) {
    var pt = playTypes[pi];
    avgHits[pt] = {
      s1: results.reduce(function(s,r){return s+r.hitCount(r.ptResults[pt].s1, r.actual);},0) / results.length,
      s2: results.reduce(function(s,r){return s+r.hitCount(r.ptResults[pt].s2, r.actual);},0) / results.length,
      s3: results.reduce(function(s,r){return s+r.hitCount(r.ptResults[pt].s3, r.actual);},0) / results.length,
      s4: results.reduce(function(s,r){return s+r.hitCount(r.ptResults[pt].s4, r.actual);},0) / results.length
    };
  }

  // 分析偏差：实际开奖但未被Top10推荐的号码
  var missedByTop = [];
  results.forEach(function(r){
    r.actual.forEach(function(n){
      if (r.top10.indexOf(n) < 0) missedByTop.push(n);
    });
  });

  // 统计missed号码的维度特征
  var missedZones = [0,0,0,0];
  var missedOdd = 0, missedEven = 0;
  missedByTop.forEach(function(n){
    missedZones[n<=20?0:n<=40?1:n<=60?2:3]++;
    if (n%2===1) missedOdd++; else missedEven++;
  });

  var insights = [];

  // 找出各玩法最优策略
  for (var pi = 0; pi < playTypes.length; pi++) {
    var pt = playTypes[pi];
    var a = avgHits[pt];
    var maxHit = Math.max(a.s1, a.s2, a.s3, a.s4);
    var bestIdx = [a.s1, a.s2, a.s3, a.s4].indexOf(maxHit);
    var names = ['区间均衡+热号', '冷号优先+遗漏', '尾数分散', '重号优选'];
    insights.push('选' + playTypeNames[pt] + '最优策略：' + names[bestIdx] + '（平均命中' + maxHit.toFixed(1) + '个）');
  }

  var maxMissedZone = missedZones.indexOf(Math.max.apply(null, missedZones));
  var zoneNames = ['一区(01-20)', '二区(21-40)', '三区(41-60)', '四区(61-80)'];
  if (missedZones[maxMissedZone] > missedByTop.length * 0.3) {
    insights.push('实际开奖中' + zoneNames[maxMissedZone] + '被遗漏最多（' + missedZones[maxMissedZone] + '个），建议提升该区权重');
  }

  if (missedOdd > missedEven * 1.3) {
    insights.push('实际开奖奇数被模型遗漏较多，奇数评分权重可适当上调');
  } else if (missedEven > missedOdd * 1.3) {
    insights.push('实际开奖偶数被模型遗漏较多，偶数评分权重可适当上调');
  }

  // 生成HTML
  var html = '<div style="margin-top:16px;padding:12px;background:var(--bg3);border-radius:8px;border:2px solid var(--accent3)">';
  html += '<h4 style="margin:0 0 8px 0;color:var(--ink)">🤖 自动复盘报告（近' + testCount + '期回溯）</h4>';

  results.forEach(function(r, idx){
    html += '<div style="margin:8px 0;padding:8px;background:var(--bg2);border-radius:6px">';
    html += '<div style="font-weight:bold;color:var(--ink);font-size:12px">' + r.period + '</div>';
    html += '<div style="color:var(--muted);font-size:11px;margin:2px 0">实际开奖：' + r.actual.map(function(n){return String(n).padStart(2,'0');}).join(',') + '</div>';

    // 按玩法显示对比
    for (var pi = 0; pi < playTypes.length; pi++) {
      var pt = playTypes[pi];
      var ptr = r.ptResults[pt];
      html += '<div style="margin-top:4px;padding:4px 6px;background:var(--bg);border-radius:4px">';
      html += '<span style="font-weight:bold;color:var(--ink);font-size:11px">选' + playTypeNames[pt] + '</span> ';
      html += '<span style="font-size:11px;background:var(--accent3);color:#000;padding:1px 4px;border-radius:3px;margin-left:4px">S1:' + r.hitCount(ptr.s1, r.actual) + '</span>';
      html += '<span style="font-size:11px;background:var(--accent);color:#000;padding:1px 4px;border-radius:3px;margin-left:2px">S2:' + r.hitCount(ptr.s2, r.actual) + '</span>';
      html += '<span style="font-size:11px;background:var(--accent5);color:#000;padding:1px 4px;border-radius:3px;margin-left:2px">S3:' + r.hitCount(ptr.s3, r.actual) + '</span>';
      html += '<span style="font-size:11px;background:var(--accent2);color:#000;padding:1px 4px;border-radius:3px;margin-left:2px">S4:' + r.hitCount(ptr.s4, r.actual) + '</span>';
      html += '</div>';
    }
    html += '</div>';
  });

  html += '<div style="margin-top:8px;padding:8px;background:rgba(245,158,11,0.1);border-radius:6px;border-left:3px solid var(--accent3)">';
  html += '<div style="font-weight:bold;color:var(--ink);font-size:12px;margin-bottom:4px">💡 模型优化建议</div>';
  insights.forEach(function(ins){
    html += '<div style="color:var(--muted);font-size:11px;margin:2px 0">• ' + ins + '</div>';
  });
  html += '</div>';
  html += '</div>';

  return { html: html, insights: insights, avgHits: avgHits };
}


function generateKL8Picks_V2(scores, history, playType) {
  // V2全玩法推荐策略（与综合推荐完全一致的选号逻辑）
  function genStrategy1(pt) {
    // S1优化：区间均衡 + 遗漏回补优先 + 热号降温过滤
    var picks = [];
    var used = {};
    var zoneLimits = [Math.ceil(pt/2), Math.ceil(pt/2), Math.ceil(pt/2), Math.ceil(pt/2)];
    var zoneCounts = [0,0,0,0];
    // 优先选有遗漏回补信号且非热号降温的号码
    var sortedScores = scores.slice().sort(function(a,b){
      var aScore = a.lastMissScore * 0.4 + a.zoneScore * 0.3 + a.wf * 0.2 + (a.sumRegression||0) * 0.1;
      var bScore = b.lastMissScore * 0.4 + b.zoneScore * 0.3 + b.wf * 0.2 + (b.sumRegression||0) * 0.1;
      // 热号降温的排后
      if (a.heatDecay < -0.1 && b.heatDecay >= -0.1) return 1;
      if (b.heatDecay < -0.1 && a.heatDecay >= -0.1) return -1;
      return bScore - aScore;
    });
    for (var i=0;i<sortedScores.length && picks.length<pt;i++) {
      var n = sortedScores[i].num;
      var z = n<=20?0:n<=40?1:n<=60?2:3;
      if (zoneCounts[z] < zoneLimits[z]) {
        picks.push(n);
        used[n] = true;
        zoneCounts[z]++;
      }
    }
    for (var i=0;i<sortedScores.length && picks.length<pt;i++) {
      if (!used[sortedScores[i].num]) {
        picks.push(sortedScores[i].num);
        used[sortedScores[i].num] = true;
      }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function genStrategy2(pt) {
    // S2优化：冷号优先+遗漏回补，更激进地利用lastMissScore，排除热号降温
    var cold = scores.slice().filter(function(s){ return s.heatDecay >= -0.05; }).sort(function(a,b){
      var aCold = a.lastMissScore * 0.7 + a.mp * 0.2 + a.mkScore * 0.1;
      var bCold = b.lastMissScore * 0.7 + b.mp * 0.2 + b.mkScore * 0.1;
      return bCold - aCold;
    }).slice(0, Math.max(pt, 15)).map(function(s){return s.num;});
    var hot = scores.slice(0, 8).filter(function(s){ return s.heatDecay >= -0.05; }).map(function(s){return s.num;});
    var hotCount = Math.ceil(pt * 0.25); // 冷号占75%
    var picks = cold.slice(0, pt - hotCount).concat(hot.filter(function(n){return cold.indexOf(n)<0;}).slice(0, hotCount));
    var unique = [];
    for (var i=0;i<picks.length && unique.length<pt;i++) if (unique.indexOf(picks[i])<0) unique.push(picks[i]);
    for (var i=0;i<scores.length && unique.length<pt;i++) {
      if (unique.indexOf(scores[i].num)<0 && scores[i].heatDecay >= -0.05) unique.push(scores[i].num);
    }
    unique.sort(function(a,b){return a-b;});
    return unique;
  }

  function genStrategy3(pt) {
    var cycleSorted = scores.slice().sort(function(a,b){
      var ca = cycleAnalysis(a.num, history);
      var cb = cycleAnalysis(b.num, history);
      return cb.score - ca.score || b.mkScore - a.mkScore;
    });
    var picks = cycleSorted.slice(0, pt).map(function(s){return s.num;});
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function genStrategy4(pt) {
    // V4重号优选策略：仅选真正的重号（在当期开奖中），最多3个，剩余全部排除重号
    var maxRepeat = Math.min(3, Math.floor(pt * 0.25));
    var picks = [];
    var used = {};
    // 第一步：仅选真正的重号，最多5个
    var repeatSorted = scores.slice().filter(function(s){ return last.indexOf(s.num) >= 0; }).sort(function(a,b){return b.totalScore - a.totalScore;});
    for (var i = 0; i < repeatSorted.length && picks.length < maxRepeat; i++) {
      var n = repeatSorted[i].num;
      if (!used[n]) {
        picks.push(n);
        used[n] = true;
      }
    }
    // 第二步：剩余名额明确排除所有重号，结合冷热+遗漏+区间均衡补充
    var zoneCounts = [0,0,0,0];
    picks.forEach(function(n){ var z=n<=20?0:n<=40?1:n<=60?2:3; zoneCounts[z]++; });
    var hybridSorted = scores.slice().filter(function(s){ return last.indexOf(s.num) < 0; }).sort(function(a,b){
      var aHybrid = a.wf*0.30 + a.mp*0.25 + a.zoneScore*0.20 + a.mkScore*0.15 + (a.stability||0)*0.10;
      var bHybrid = b.wf*0.30 + b.mp*0.25 + b.zoneScore*0.20 + b.mkScore*0.15 + (b.stability||0)*0.10;
      return bHybrid - aHybrid;
    });
    for (var i = 0; i < hybridSorted.length && picks.length < pt; i++) {
      var n = hybridSorted[i].num;
      if (!used[n]) {
        var z = n<=20?0:n<=40?1:n<=60?2:3;
        if (zoneCounts[z] < Math.ceil(pt/2)) {
          picks.push(n);
          used[n] = true;
          zoneCounts[z]++;
        }
      }
    }
    // 兜底：从非重号中按总分补
    for (var i = 0; i < scores.length && picks.length < pt; i++) {
      var n = scores[i].num;
      if (!used[n] && last.indexOf(n) < 0) {
        picks.push(n);
        used[n] = true;
      }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function genStrategy5(pt) {
    // S5专家技巧综合策略：冷热6:4 + 重号2-3个 + 奇偶均衡 + 大小均衡 + 四区分散 + 尾数错开 + 遗漏回补 + 连号
    var picks = [];
    var used = {};

    // 统计冷热号
    var hotNums = scores.filter(function(s){ return s.wf > 0.20; }).map(function(s){ return s.num; });
    var warmNums = scores.filter(function(s){ return s.wf > 0.08 && s.wf <= 0.20; }).map(function(s){ return s.num; });
    var coldNums = scores.filter(function(s){ return s.wf <= 0.08 && s.lastMissScore > 0.5; }).map(function(s){ return s.num; });

    // 1. 重号均衡：选2-3个上期重号（选十）或1-2个（选五）
    var repeatCount = pt >= 10 ? 3 : 2;
    var repeatCandidates = scores.filter(function(s){ return last.indexOf(s.num) >= 0 && s.totalScore > 0.5; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
    for (var i = 0; i < repeatCandidates.length && picks.length < repeatCount; i++) {
      var n = repeatCandidates[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }

    // 2. 遗漏回补：选1-2个遗漏7-13期的号码
    var missCandidates = scores.filter(function(s){ return s.lastMissScore >= 0.55 && s.lastMissScore <= 0.85 && !used[s.num]; }).sort(function(a,b){ return b.lastMissScore - a.lastMissScore; });
    for (var i = 0; i < missCandidates.length && picks.length < pt * 0.25; i++) {
      var n = missCandidates[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }

    // 3. 冷热搭配：热号60% + 温号/冷号40%
    var hotTarget = Math.ceil(pt * 0.5); // 热号
    var warmTarget = Math.ceil(pt * 0.25); // 温号
    var coldTarget = pt - hotTarget - warmTarget; // 冷号

    for (var i = 0; i < hotNums.length && picks.length < hotTarget; i++) {
      if (!used[hotNums[i]]) { picks.push(hotNums[i]); used[hotNums[i]] = true; }
    }
    for (var i = 0; i < warmNums.length && picks.length < hotTarget + warmTarget; i++) {
      if (!used[warmNums[i]]) { picks.push(warmNums[i]); used[warmNums[i]] = true; }
    }
    for (var i = 0; i < coldNums.length && picks.length < pt; i++) {
      if (!used[coldNums[i]]) { picks.push(coldNums[i]); used[coldNums[i]] = true; }
    }

    // 4. 四区分散：确保每区至少1个
    var zoneCounts = [0,0,0,0];
    picks.forEach(function(n){ var z=n<=20?0:n<=40?1:n<=60?2:3; zoneCounts[z]++; });
    for (var z = 0; z < 4; z++) {
      if (zoneCounts[z] === 0) {
        var zoneCandidates = scores.filter(function(s){ var sz=s.num<=20?0:s.num<=40?1:s.num<=60?2:3; return sz===z && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (zoneCandidates.length > 0) {
          var n = zoneCandidates[0].num;
          // 找一个已选的同区号码替换，或者添加
          if (picks.length >= pt) {
            // 找最多那个区的一个号码替换
            var maxZ = zoneCounts.indexOf(Math.max.apply(null, zoneCounts));
            if (maxZ !== z && zoneCounts[maxZ] > 1) {
              for (var ri = 0; ri < picks.length; ri++) {
                var rz = picks[ri]<=20?0:picks[ri]<=40?1:picks[ri]<=60?2:3;
                if (rz === maxZ) { used[picks[ri]] = false; picks[ri] = n; used[n] = true; break; }
              }
            }
          } else {
            picks.push(n); used[n] = true;
          }
          zoneCounts[z]++;
        }
      }
    }

    // 5. 奇偶均衡
    var oddCount = picks.filter(function(n){ return n%2===1; }).length;
    var evenCount = picks.length - oddCount;
    var targetOdd = Math.round(picks.length * 0.5); // 目标奇数数量
    if (Math.abs(oddCount - evenCount) > 2 && picks.length >= pt * 0.8) {
      if (oddCount > evenCount + 2) {
        // 奇数太多，替换为奇偶比更均衡的
        var oddPicks = picks.filter(function(n){ return n%2===1; });
        var evenCandidates = scores.filter(function(s){ return s.num%2===0 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (evenCandidates.length > 0 && oddPicks.length > 0) {
          used[oddPicks[0]] = false;
          picks[picks.indexOf(oddPicks[0])] = evenCandidates[0].num;
          used[evenCandidates[0].num] = true;
        }
      } else if (evenCount > oddCount + 2) {
        var evenPicks = picks.filter(function(n){ return n%2===0; });
        var oddCandidates = scores.filter(function(s){ return s.num%2===1 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (oddCandidates.length > 0 && evenPicks.length > 0) {
          used[evenPicks[0]] = false;
          picks[picks.indexOf(evenPicks[0])] = oddCandidates[0].num;
          used[oddCandidates[0].num] = true;
        }
      }
    }

    // 6. 大小均衡
    var smallCount = picks.filter(function(n){ return n <= 40; }).length;
    var bigCount = picks.length - smallCount;
    if (Math.abs(smallCount - bigCount) > 2 && picks.length >= pt * 0.8) {
      if (smallCount > bigCount + 2) {
        var smallPicks = picks.filter(function(n){ return n <= 40; });
        var bigCandidates = scores.filter(function(s){ return s.num > 40 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (bigCandidates.length > 0 && smallPicks.length > 0) {
          used[smallPicks[0]] = false;
          picks[picks.indexOf(smallPicks[0])] = bigCandidates[0].num;
          used[bigCandidates[0].num] = true;
        }
      } else if (bigCount > smallCount + 2) {
        var bigPicks = picks.filter(function(n){ return n > 40; });
        var smallCandidates = scores.filter(function(s){ return s.num <= 40 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (smallCandidates.length > 0 && bigPicks.length > 0) {
          used[bigPicks[0]] = false;
          picks[picks.indexOf(bigPicks[0])] = smallCandidates[0].num;
          used[smallCandidates[0].num] = true;
        }
      }
    }

    // 7. 尾数错开：避免3个以上同尾数
    var tailCounts = {};
    picks.forEach(function(n){ var t=n%10; tailCounts[t]=(tailCounts[t]||0)+1; });
    for (var t in tailCounts) {
      if (tailCounts[t] >= 3) {
        var sameTail = picks.filter(function(n){ return n%10===parseInt(t); }).sort(function(a,b){ return scores.find(function(s){return s.num===a;}).totalScore - scores.find(function(s){return s.num===b;}).totalScore; });
        var replaceCandidates = scores.filter(function(s){ return s.num%10!==parseInt(t) && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (replaceCandidates.length > 0 && sameTail.length > 0) {
          used[sameTail[0]] = false;
          picks[picks.indexOf(sameTail[0])] = replaceCandidates[0].num;
          used[replaceCandidates[0].num] = true;
          tailCounts[t]--; tailCounts[replaceCandidates[0].num%10] = (tailCounts[replaceCandidates[0].num%10]||0)+1;
        }
      }
    }

    // 8. 补足到pt个
    for (var i = 0; i < scores.length && picks.length < pt; i++) {
      var n = scores[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }

    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  return [
    {name:'区间均衡+热号', picks:genStrategy1(playType)},
    {name:'冷号优先+遗漏', picks:genStrategy2(playType)},
    {name:'重号优选', picks:genStrategy4(playType)},
    {name:'专家技巧综合', picks:genStrategy5(playType)}
  ];
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
    // S1优化：区间均衡 + 遗漏回补优先 + 热号降温过滤
    var picks = [];
    var used = {};
    var zoneLimits = [Math.ceil(playType/2), Math.ceil(playType/2), Math.ceil(playType/2), Math.ceil(playType/2)];
    var zoneCounts = [0,0,0,0];
    var sortedScores = scores.slice().sort(function(a,b){
      var aScore = a.lastMissScore * 0.4 + a.zoneScore * 0.3 + a.wf * 0.2 + (a.sumRegression||0) * 0.1;
      var bScore = b.lastMissScore * 0.4 + b.zoneScore * 0.3 + b.wf * 0.2 + (b.sumRegression||0) * 0.1;
      if (a.heatDecay < -0.1 && b.heatDecay >= -0.1) return 1;
      if (b.heatDecay < -0.1 && a.heatDecay >= -0.1) return -1;
      return bScore - aScore;
    });
    for (var i=0;i<sortedScores.length && picks.length<playType;i++) {
      var n = sortedScores[i].num;
      var z = n<=20?0:n<=40?1:n<=60?2:3;
      if (zoneCounts[z] < zoneLimits[z]) {
        picks.push(n);
        used[n] = true;
        zoneCounts[z]++;
      }
    }
    for (var i=0;i<sortedScores.length && picks.length<playType;i++) {
      if (!used[sortedScores[i].num]) {
        picks.push(sortedScores[i].num);
        used[sortedScores[i].num] = true;
      }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function genStrategy2(playType) {
    // S2优化：冷号优先+遗漏回补，更激进地利用lastMissScore，排除热号降温
    var cold = scores.slice().filter(function(s){ return s.heatDecay >= -0.05; }).sort(function(a,b){
      var aCold = a.lastMissScore * 0.7 + a.mp * 0.2 + a.mkScore * 0.1;
      var bCold = b.lastMissScore * 0.7 + b.mp * 0.2 + b.mkScore * 0.1;
      return bCold - aCold;
    }).slice(0, Math.max(playType, 15)).map(function(s){return s.num;});
    var hot = scores.slice(0, 8).filter(function(s){ return s.heatDecay >= -0.05; }).map(function(s){return s.num;});
    var hotCount = Math.ceil(playType * 0.25);
    var picks = cold.slice(0, playType - hotCount).concat(hot.filter(function(n){return cold.indexOf(n)<0;}).slice(0, hotCount));
    var unique = [];
    for (var i=0;i<picks.length && unique.length<playType;i++) if (unique.indexOf(picks[i])<0) unique.push(picks[i]);
    for (var i=0;i<scores.length && unique.length<playType;i++) {
      if (unique.indexOf(scores[i].num)<0 && scores[i].heatDecay >= -0.05) unique.push(scores[i].num);
    }
    unique.sort(function(a,b){return a-b;});
    return unique;
  }

  function genStrategy3(playType) {
    // 周期驱动：以周期评分排序
    var cycleSorted = scores.slice().sort(function(a,b){
      var ca = cycleAnalysis(a.num, history);
      var cb = cycleAnalysis(b.num, history);
      return cb.score - ca.score || b.mkScore - a.mkScore;
    });
    var picks = cycleSorted.slice(0, playType).map(function(s){return s.num;});
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function genStrategy4(playType) {
    // V4重号优选策略：仅选真正的重号（在当期开奖中），最多3个，剩余全部排除重号
    var maxRepeat = Math.min(3, Math.floor(playType * 0.25));
    var picks = [];
    var used = {};
    // 第一步：仅选真正的重号（neighborScore === 0.9 即 last.indexOf(n) >= 0），最多5个
    var repeatSorted = scores.slice().filter(function(s){ return last.indexOf(s.num) >= 0; }).sort(function(a,b){return b.totalScore - a.totalScore;});
    for (var i = 0; i < repeatSorted.length && picks.length < maxRepeat; i++) {
      var n = repeatSorted[i].num;
      if (!used[n]) {
        picks.push(n);
        used[n] = true;
      }
    }
    // 第二步：剩余名额明确排除所有重号，结合冷热+遗漏+区间均衡补充
    var zoneCounts = [0,0,0,0];
    picks.forEach(function(n){ var z=n<=20?0:n<=40?1:n<=60?2:3; zoneCounts[z]++; });
    var hybridSorted = scores.slice().filter(function(s){ return last.indexOf(s.num) < 0; }).sort(function(a,b){
      // 综合评分：频率30% + 遗漏回补25% + 区间评分20% + 周期驱动15% + 稳定性10%
      var aHybrid = a.wf*0.30 + a.mp*0.25 + a.zoneScore*0.20 + a.mkScore*0.15 + (a.stability||0)*0.10;
      var bHybrid = b.wf*0.30 + b.mp*0.25 + b.zoneScore*0.20 + b.mkScore*0.15 + (b.stability||0)*0.10;
      return bHybrid - aHybrid;
    });
    for (var i = 0; i < hybridSorted.length && picks.length < playType; i++) {
      var n = hybridSorted[i].num;
      if (!used[n]) {
        var z = n<=20?0:n<=40?1:n<=60?2:3;
        if (zoneCounts[z] < Math.ceil(playType/2)) {
          picks.push(n);
          used[n] = true;
          zoneCounts[z]++;
        }
      }
    }
    // 兜底：如果还不够，从非重号中按总分补
    for (var i = 0; i < scores.length && picks.length < playType; i++) {
      var n = scores[i].num;
      if (!used[n] && last.indexOf(n) < 0) {
        picks.push(n);
        used[n] = true;
      }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function genStrategy5(playType) {
    // S5专家技巧综合策略：冷热6:4 + 重号2-3个 + 奇偶均衡 + 大小均衡 + 四区分散 + 尾数错开 + 遗漏回补
    var pt = playType;
    var picks = [];
    var used = {};
    var hotNums = scores.filter(function(s){ return s.wf > 0.20; }).map(function(s){ return s.num; });
    var warmNums = scores.filter(function(s){ return s.wf > 0.08 && s.wf <= 0.20; }).map(function(s){ return s.num; });
    var coldNums = scores.filter(function(s){ return s.wf <= 0.08 && s.lastMissScore > 0.5; }).map(function(s){ return s.num; });
    var repeatCount = pt >= 10 ? 3 : 2;
    var repeatCandidates = scores.filter(function(s){ return last.indexOf(s.num) >= 0 && s.totalScore > 0.5; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
    for (var i = 0; i < repeatCandidates.length && picks.length < repeatCount; i++) {
      var n = repeatCandidates[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }
    var missCandidates = scores.filter(function(s){ return s.lastMissScore >= 0.55 && s.lastMissScore <= 0.85 && !used[s.num]; }).sort(function(a,b){ return b.lastMissScore - a.lastMissScore; });
    for (var i = 0; i < missCandidates.length && picks.length < pt * 0.25; i++) {
      var n = missCandidates[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }
    var hotTarget = Math.ceil(pt * 0.5);
    var warmTarget = Math.ceil(pt * 0.25);
    for (var i = 0; i < hotNums.length && picks.length < hotTarget; i++) {
      if (!used[hotNums[i]]) { picks.push(hotNums[i]); used[hotNums[i]] = true; }
    }
    for (var i = 0; i < warmNums.length && picks.length < hotTarget + warmTarget; i++) {
      if (!used[warmNums[i]]) { picks.push(warmNums[i]); used[warmNums[i]] = true; }
    }
    for (var i = 0; i < coldNums.length && picks.length < pt; i++) {
      if (!used[coldNums[i]]) { picks.push(coldNums[i]); used[coldNums[i]] = true; }
    }
    var zoneCounts = [0,0,0,0];
    picks.forEach(function(n){ var z=n<=20?0:n<=40?1:n<=60?2:3; zoneCounts[z]++; });
    for (var z = 0; z < 4; z++) {
      if (zoneCounts[z] === 0) {
        var zoneCandidates = scores.filter(function(s){ var sz=s.num<=20?0:s.num<=40?1:s.num<=60?2:3; return sz===z && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (zoneCandidates.length > 0) {
          var n = zoneCandidates[0].num;
          if (picks.length >= pt) {
            var maxZ = zoneCounts.indexOf(Math.max.apply(null, zoneCounts));
            if (maxZ !== z && zoneCounts[maxZ] > 1) {
              for (var ri = 0; ri < picks.length; ri++) {
                var rz = picks[ri]<=20?0:picks[ri]<=40?1:picks[ri]<=60?2:3;
                if (rz === maxZ) { used[picks[ri]] = false; picks[ri] = n; used[n] = true; break; }
              }
            }
          } else {
            picks.push(n); used[n] = true;
          }
          zoneCounts[z]++;
        }
      }
    }
    var oddCount = picks.filter(function(n){ return n%2===1; }).length;
    var evenCount = picks.length - oddCount;
    if (Math.abs(oddCount - evenCount) > 2 && picks.length >= pt * 0.8) {
      if (oddCount > evenCount + 2) {
        var oddPicks = picks.filter(function(n){ return n%2===1; });
        var evenCandidates = scores.filter(function(s){ return s.num%2===0 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (evenCandidates.length > 0 && oddPicks.length > 0) {
          used[oddPicks[0]] = false;
          picks[picks.indexOf(oddPicks[0])] = evenCandidates[0].num;
          used[evenCandidates[0].num] = true;
        }
      } else if (evenCount > oddCount + 2) {
        var evenPicks = picks.filter(function(n){ return n%2===0; });
        var oddCandidates = scores.filter(function(s){ return s.num%2===1 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (oddCandidates.length > 0 && evenPicks.length > 0) {
          used[evenPicks[0]] = false;
          picks[picks.indexOf(evenPicks[0])] = oddCandidates[0].num;
          used[oddCandidates[0].num] = true;
        }
      }
    }
    var smallCount = picks.filter(function(n){ return n <= 40; }).length;
    var bigCount = picks.length - smallCount;
    if (Math.abs(smallCount - bigCount) > 2 && picks.length >= pt * 0.8) {
      if (smallCount > bigCount + 2) {
        var smallPicks = picks.filter(function(n){ return n <= 40; });
        var bigCandidates = scores.filter(function(s){ return s.num > 40 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (bigCandidates.length > 0 && smallPicks.length > 0) {
          used[smallPicks[0]] = false;
          picks[picks.indexOf(smallPicks[0])] = bigCandidates[0].num;
          used[bigCandidates[0].num] = true;
        }
      } else if (bigCount > smallCount + 2) {
        var bigPicks = picks.filter(function(n){ return n > 40; });
        var smallCandidates = scores.filter(function(s){ return s.num <= 40 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (smallCandidates.length > 0 && bigPicks.length > 0) {
          used[bigPicks[0]] = false;
          picks[picks.indexOf(bigPicks[0])] = smallCandidates[0].num;
          used[smallCandidates[0].num] = true;
        }
      }
    }
    var tailCounts = {};
    picks.forEach(function(n){ var t=n%10; tailCounts[t]=(tailCounts[t]||0)+1; });
    for (var t in tailCounts) {
      if (tailCounts[t] >= 3) {
        var sameTail = picks.filter(function(n){ return n%10===parseInt(t); }).sort(function(a,b){ return (scores.find(function(s){return s.num===a;})||{totalScore:0}).totalScore - (scores.find(function(s){return s.num===b;})||{totalScore:0}).totalScore; });
        var replaceCandidates = scores.filter(function(s){ return s.num%10!==parseInt(t) && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (replaceCandidates.length > 0 && sameTail.length > 0) {
          used[sameTail[0]] = false;
          picks[picks.indexOf(sameTail[0])] = replaceCandidates[0].num;
          used[replaceCandidates[0].num] = true;
          tailCounts[t]--; tailCounts[replaceCandidates[0].num%10] = (tailCounts[replaceCandidates[0].num%10]||0)+1;
        }
      }
    }
    for (var i = 0; i < scores.length && picks.length < pt; i++) {
      var n = scores[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  var html = '<div class="recommend-container" style="padding:12px"><h3 style="margin-top:0;color:var(--ink)">🎯 V2 全玩法推荐模型</h3>';
  html += '<p style="color:var(--muted);font-size:12px;margin-bottom:12px">基于加权频率·遗漏百分位·区间均衡·奇偶均衡·大小均衡·尾数分散·连号历史·稳定性 九维评分体系 + 专家技巧综合策略（冷热搭配·重号均衡·四区分散·尾数错开）</p>';

  var playTypeNames = ['一','二','三','四','五','六','七','八','九','十'];

  var allPlayTypeRecs = {};
  for (var pt = 5; pt <= 10; pt++) {
    var s1 = genStrategy1(pt);
    var s2 = genStrategy2(pt);
    var s3 = genStrategy3(pt);
    var s4 = genStrategy4(pt);
    var s5 = genStrategy5(pt);
    var strategies = [
      {name:'区间均衡+热号', picks:s1, q:qualityScoreKL8(s1)},
      {name:'冷号优先+遗漏', picks:s2, q:qualityScoreKL8(s2)},
      {name:'重号优选', picks:s4, q:qualityScoreKL8(s4)},
      {name:'专家技巧综合', picks:s5, q:qualityScoreKL8(s5)}
    ];
    allPlayTypeRecs[pt] = strategies;

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

    // 选五/六/九复式：基础选号 + 额外2个号码
    if (pt === 5 || pt === 6 || pt === 9) {
      var fushiCount = pt === 5 ? 7 : pt === 6 ? 8 : 11;
      var fushiPicks = scores.slice(0, fushiCount).map(function(s){return s.num;});
      var fushiQ = qualityScoreKL8(fushiPicks);
      var fushiName = pt === 5 ? '五' : pt === 6 ? '六' : '九';
      html += '<div class="strategy-box" style="margin:12px 0;padding:12px;border:1px solid var(--rule);border-radius:8px;background:linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(59,130,246,0.08) 100%)">';
      html += '<h4 style="margin:0 0 6px 0;color:var(--ink)">选'+fushiName+'复式（'+fushiCount+'个号码·C('+fushiCount+','+pt+')注）</h4>';
      html += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap">';
      html += '<span style="font-weight:bold;color:var(--accent)">复式方案：</span>';
      html += '<span style="color:var(--ink)">'+fushiPicks.map(function(n){return String(n).padStart(2,'0');}).join(', ')+'</span>';
      html += '<span style="margin-left:auto;background:'+(fushiQ>=85?'var(--accent3)':(fushiQ>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:12px">质量分 '+fushiQ+'</span>';
      html += '</div>';
      html += '<p style="margin:4px 0 0 0;color:var(--muted);font-size:11px">从'+fushiCount+'个号码中选取'+pt+'个，复式投注覆盖更多组合</p>';
      html += '</div>';
    }
  }

  // 自动保存预测记录到localStorage（预测基于当前历史数据，待下期开奖后验证）
  saveKL8AllPredictions(last, allPlayTypeRecs);

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

  // 熵值分析
  var ent = entropyAnalysis(history, 80);
  html += '<div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--accent5)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:4px">📈 号码分布熵值：'+(ent.ratio*100).toFixed(1)+'%</div>';
  html += '<div style="color:var(--muted);font-size:11px">'+(ent.ratio > 0.85 ? '近期号码分布均匀，冷热平衡' : ent.ratio > 0.7 ? '分布适中，有轻微集中趋势' : '分布集中，冷热分化明显')+'</div>';
  html += '</div>';

  // 回测结果（选十玩法）
  var backtestFunc = function(trainData) {
    var scores = scoreKL8Numbers(trainData[trainData.length-1], trainData.slice(0,-1));
    return scores.slice(0,10).map(function(s){return s.num;});
  };
  var bt = backtestModel(history, null, backtestFunc, 10, 20);
  if (bt.tests > 0) {
    html += '<div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--accent2)">';
    html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:4px">🧪 回测验证（近'+bt.tests+'期）</div>';
    html += '<div style="color:var(--muted);font-size:11px">选十Top10平均命中：'+bt.avgHit.toFixed(2)+'个（命中率 '+bt.avgRate.toFixed(1)+'%）</div>';
    html += '</div>';
  }

  // 自动复盘（try-catch保护，不影响主推荐）
  try {
    var autoReview = runKL8AutoReview(history);
    if (autoReview.html) {
      html += autoReview.html;
    }
  } catch(e) {
    console.log('自动复盘执行失败:', e.message);
  }

  html += '<div class="disclaimer" style="margin-top:1.5rem"><strong>声明：</strong>以上推荐号码基于历史数据统计分析生成，仅供娱乐参考。彩票开奖为随机事件，不构成任何投注建议。</div>';
  html += '</div>';

  document.getElementById('kl8-recommend').innerHTML = html;

  // 提取选五和选十的推荐写入独立容器
  (function(){
    var playTypeNames = {5:'五', 6:'六', 7:'七', 8:'八', 9:'九', 10:'十'};
    [5, 10].forEach(function(pt) {
      var strategies = allPlayTypeRecs[pt];
      if (!strategies) return;
      var containerId = pt === 5 ? 'kl8-recommend-5' : 'kl8-recommend-10';
      var container = document.getElementById(containerId);
      if (!container) return;

      var h = '<div style="padding:12px">';
      h += '<div style="font-size:0.85rem;color:var(--muted);margin-bottom:1rem">';
      h += '基于4个策略的加权评分推荐，每个策略生成1注选' + playTypeNames[pt] + '号码</div>';

      for (var si = 0; si < strategies.length; si++) {
        var st = strategies[si];
        h += '<div style="margin:12px 0;padding:12px;border:1px solid var(--rule);border-radius:8px;background:var(--bg2)">';
        h += '<h4 style="margin:0 0 6px 0;color:var(--ink)">策略' + (si+1) + '：' + st.name + '</h4>';
        h += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap">';
        h += '<span style="font-weight:bold;color:var(--accent4)">方案：</span>';
        st.picks.forEach(function(n) {
          h += '<div class="ball red" style="width:32px;height:32px;font-size:12px">' + String(n).padStart(2,'0') + '</div>';
        });
        h += '<span style="margin-left:auto;background:'+(st.q>=85?'var(--accent3)':(st.q>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:12px">质量分 '+st.q+'</span>';
        h += '</div></div>';
      }

      // 复式推荐
      if (pt === 5 || pt === 9) {
        var fushiCount = pt === 5 ? 7 : 11;
        var fushiPicks = scores.slice(0, fushiCount).map(function(s){return s.num;});
        var fushiQ = qualityScoreKL8(fushiPicks);
        h += '<div style="margin:12px 0;padding:12px;border:1px solid var(--rule);border-radius:8px;background:linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(59,130,246,0.08) 100%)">';
        h += '<h4 style="margin:0 0 6px 0;color:var(--ink)">选' + playTypeNames[pt] + '复式（'+fushiCount+'个号码·C('+fushiCount+','+pt+')注）</h4>';
        h += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap">';
        h += '<span style="font-weight:bold;color:var(--accent)">复式方案：</span>';
        fushiPicks.forEach(function(n) {
          h += '<div class="ball gold" style="width:32px;height:32px;font-size:12px">' + String(n).padStart(2,'0') + '</div>';
        });
        h += '<span style="margin-left:auto;background:'+(fushiQ>=85?'var(--accent3)':(fushiQ>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:12px">质量分 '+fushiQ+'</span>';
        h += '</div>';
        h += '<p style="margin:4px 0 0 0;color:var(--muted);font-size:11px">从'+fushiCount+'个号码中选取'+pt+'个，复式投注覆盖更多组合</p>';
        h += '</div>';
      }

      h += '</div>';
      container.innerHTML = h;
    });
  })();

  // 保存当前推荐到 localStorage，供次日回测直接使用（避免重新计算导致号码不一致）
  try {
    var newLastDraw = last.join(',');
    var currentSaved = localStorage.getItem('kl8_recommendations');
    if (currentSaved) {
      var currentParsed = JSON.parse(currentSaved);
      // 只有当当前保存的不是同一期数据时，才移到"昨日"
      if (currentParsed.lastDraw !== newLastDraw) {
        localStorage.setItem('kl8_previous_recommendations', currentSaved);
      }
    }
    var recsData = {
      date: new Date().toISOString().split('T')[0],
      lastDraw: newLastDraw,
      recommendations: allPlayTypeRecs
    };
    localStorage.setItem('kl8_recommendations', JSON.stringify(recsData));
  } catch(e) {
    console.log('保存KL8推荐失败:', e.message);
  }
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

  html += '<div class="result-row"><span class="result-label">当期奇偶比</span><span class="result-value">' + oddEvenRatios[0].odd + ':' + oddEvenRatios[0].even + '</span></div>';
  html += '<div class="result-row"><span class="result-label">历史均奇数</span><span class="result-value">' + avgOdd + ' 个</span></div>';

  // Big/small ratio
  var bigSmallRatios = [];
  for (var i = 0; i < history.length; i++) {
    var bigC = history[i].filter(function(n){return n>40;}).length;
    bigSmallRatios.push({ big: bigC, small: 20 - bigC });
  }
  var avgBig = (bigSmallRatios.reduce(function(s,r){return s+r.big},0) / bigSmallRatios.length).toFixed(1);

  html += '<div class="result-row"><span class="result-label">当期大小比</span><span class="result-value">' + bigSmallRatios[0].big + ':' + bigSmallRatios[0].small + '</span></div>';
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
  html += '<div class="result-row"><span class="result-label">当期连号对数</span><span class="result-value">' + consecCounts[0] + ' 对</span></div>';
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
  html += '<div class="result-row" style="margin-top:0.75rem"><span class="result-label">当期尾数覆盖</span><span class="result-value">' + coveredCount + '/10</span></div>';

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

  html += '<div class="result-row"><span class="result-label">当期连号组数</span><span class="result-value">' + consecutiveCounts[0] + ' 组</span></div>';
  html += '<div class="result-row"><span class="result-label">历史平均连号</span><span class="result-value">' + avgConsec + ' 组</span></div>';
  html += '<div class="result-row"><span class="result-label">历史最大连号</span><span class="result-value">' + maxConsec + ' 组</span></div>';
  html += '<div class="result-row"><span class="result-label">历史最小连号</span><span class="result-value">' + minConsec + ' 组</span></div>';

  // Show last period consecutive details
  if (consecutiveDetails[0].length > 0) {
    html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">当期连号详情</div>';
    html += '<div class="ball-row">';
    for (var i = 0; i < consecutiveDetails[0].length; i++) {
      var group = consecutiveDetails[0][i];
      var label = group.map(function(n){return pad(n)}).join('-');
      html += '<div class="ball red" style="width:auto;min-width:60px;padding:0 10px;font-size:0.75rem;border-radius:20px">' + label + '</div>';
    }
    html += '</div>';
  } else {
    html += '<div style="margin-top:1rem;color:var(--muted);font-size:0.85rem">当期无连号</div>';
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

  html += '<div class="result-row"><span class="result-label">当期AC值</span><span class="result-value">' + acValues[0] + '</span></div>';
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
    interpretation = '当期号码分布非常离散，差值种类丰富';
  } else if (acValues[0] <= minAC * 1.1) {
    interpretation = '当期号码分布较集中，差值种类较少';
  } else {
    interpretation = '当期号码分布适中，差值种类正常';
  }
  html += '<div class="result-row"><span class="result-label">分布解读</span><span class="result-value">' + interpretation + '</span></div>';

  html += '</div>';
  document.getElementById('kl8-ac').innerHTML = html;
  renderKL8ACChart(acValues);
}

// ==================== 当期选号复盘函数 ====================

function reviewDLT() {
  var userFront = parseNums(document.getElementById('dlt-review-numbers').value);
  var userBack = parseNums(document.getElementById('dlt-review-blue').value);
  if (userFront.length < 5) { alert('请输入至少5个前区号码'); return; }

  var last = dltSampleHistory[0].split('|');
  var lastFront = parseNums(last[0]);
  var lastBack = parseNums(last[1]);

  var hitFront = userFront.filter(function(n){ return lastFront.indexOf(n) >= 0; });
  var hitBack = userBack.filter(function(n){ return lastBack.indexOf(n) >= 0; });

  var html = '<div style="margin-bottom:0.5rem"><strong>当期开奖：</strong>前区 ' + lastFront.map(function(n){return pad(n);}).join(',') + ' + 后区 ' + lastBack.map(function(n){return pad(n);}).join(',') + '</div>';
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

  // 自动复盘：分析模型Top10推荐与实际开奖的对比
  try {
    var dltHistory = dltSampleHistory.map(function(h) {
      var parts = h.split('|');
      return parseNums(parts[0]);
    });
    var lastDLTFront = dltHistory[0];
    var trainData = dltHistory.slice(1);
    if (trainData.length >= 5) {
      var modelScores = scoreDLTNumbers_V3(trainData[0], trainData);
      var top10 = modelScores.slice(0, 10).map(function(s){return s.num;});
      var modelHit = top10.filter(function(n){ return lastFront.indexOf(n) >= 0; }).length;
      var missedByModel = lastFront.filter(function(n){ return top10.indexOf(n) < 0; });

      html += '<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg3);border-radius:8px;border:1px solid var(--accent2)">';
      html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">🤖 模型推荐复盘（基于上期数据预测本期）</div>';
      html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:6px">模型Top10推荐：' + top10.map(function(n){return pad(n);}).join(',') + '</div>';
      html += '<div style="color:var(--muted);font-size:0.85rem">模型命中：' + modelHit + '/10个（前区命中' + modelHit + '/5个）</div>';

      if (missedByModel.length > 0) {
        html += '<div style="margin-top:6px;padding:6px 8px;background:rgba(245,158,11,0.08);border-radius:6px">';
        html += '<div style="color:var(--ink);font-size:11px;font-weight:bold;margin-bottom:3px">💡 模型遗漏号码</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
        missedByModel.forEach(function(n) {
          html += '<span class="ball red" style="width:32px;height:32px;font-size:0.7rem">' + pad(n) + '</span>';
        });
        html += '</div>';
        // 分析遗漏号码的维度特征
        var missedZones = missedByModel.map(function(n){ return n<=12?0:n<=23?1:2; });
        var missedOdd = missedByModel.filter(function(n){return n%2===1;}).length;
        var zoneNames = ['一区(01-12)', '二区(13-23)', '三区(24-35)'];
        html += '<div style="color:var(--muted);font-size:10px;margin-top:4px">';
        html += '遗漏号码区间：' + missedByModel.map(function(n,i){return pad(n)+'('+zoneNames[n<=12?0:n<=23?1:2]+')';}).join('、');
        if (missedOdd > 0) html += ' | 奇数遗漏' + missedOdd + '个';
        html += '</div></div>';
      }
      html += '</div>';
    }
  } catch(e) {
    console.log('DLT自动复盘失败:', e.message);
  }

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

  var html = '<div style="margin-bottom:0.5rem"><strong>当期开奖：</strong>红球 ' + lastRed.map(function(n){return pad(n);}).join(',') + ' + 蓝球 ' + lastBlue.map(function(n){return pad(n);}).join(',') + '</div>';
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

  // 自动复盘：分析模型Top10推荐与实际开奖的对比
  try {
    var ssqHistory = ssqSampleHistory.map(function(h) {
      var parts = h.split('|');
      return parseNums(parts[0]);
    });
    var trainData = ssqHistory.slice(1);
    if (trainData.length >= 5) {
      var modelScores = scoreSSQNumbers({red: trainData[0]}, trainData);
      var top10 = modelScores.slice(0, 10).map(function(s){return s.num;});
      var modelHit = top10.filter(function(n){ return lastRed.indexOf(n) >= 0; }).length;
      var missedByModel = lastRed.filter(function(n){ return top10.indexOf(n) < 0; });

      html += '<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg3);border-radius:8px;border:1px solid var(--accent2)">';
      html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">🤖 模型推荐复盘（基于上期数据预测本期）</div>';
      html += '<div style="color:var(--muted);font-size:0.85rem;margin-bottom:6px">模型Top10推荐：' + top10.map(function(n){return pad(n);}).join(',') + '</div>';
      html += '<div style="color:var(--muted);font-size:0.85rem">模型命中：' + modelHit + '/10个（红球命中' + modelHit + '/6个）</div>';

      if (missedByModel.length > 0) {
        html += '<div style="margin-top:6px;padding:6px 8px;background:rgba(245,158,11,0.08);border-radius:6px">';
        html += '<div style="color:var(--ink);font-size:11px;font-weight:bold;margin-bottom:3px">💡 模型遗漏号码</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
        missedByModel.forEach(function(n) {
          html += '<span class="ball red" style="width:32px;height:32px;font-size:0.7rem">' + pad(n) + '</span>';
        });
        html += '</div>';
        var zoneNames = ['一区(01-11)', '二区(12-22)', '三区(23-33)'];
        var missedOdd = missedByModel.filter(function(n){return n%2===1;}).length;
        html += '<div style="color:var(--muted);font-size:10px;margin-top:4px">';
        html += '遗漏号码区间：' + missedByModel.map(function(n){return pad(n)+'('+zoneNames[n<=11?0:n<=22?1:2]+')';}).join('、');
        if (missedOdd > 0) html += ' | 奇数遗漏' + missedOdd + '个';
        html += '</div></div>';
      }
      html += '</div>';
    }
  } catch(e) {
    console.log('SSQ自动复盘失败:', e.message);
  }

  document.getElementById('ssq-review-result').innerHTML = html;
}

function reviewKL8() {
  var userNums = parseNums(document.getElementById('kl8-review-numbers').value);
  if (userNums.length < 1) { alert('请输入至少1个号码'); return; }

  var lastNums = parseNums(kl8SampleHistory[0]);
  var hitNums = userNums.filter(function(n){ return lastNums.indexOf(n) >= 0; });

  var html = '<div style="margin-bottom:0.5rem"><strong>当期开奖（20个）：</strong>' + lastNums.map(function(n){return pad(n);}).join(',') + '</div>';
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

// ==================== 大乐透新功能模块 ====================

// 摇奖机模拟选号 - 基于大模型评分加权随机抽取
function spinDLTLottery() {
  var frontStr = document.getElementById('dlt-front').value;
  var backStr = document.getElementById('dlt-back').value;
  var historyStr = document.getElementById('dlt-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var f = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (f.length >= 5 && b.length >= 2) {
      history.push({ front: f.slice(0, 5).sort(function(a,b){return a-b}), back: b.slice(0, 2).sort(function(a,b){return a-b}) });
    }
  }
  var lastFront = parseNums(frontStr);
  var lastBack = parseNums(backStr);
  var hasInputLast = lastFront.length >= 5 && lastBack.length >= 2;
  if (history.length === 0 && hasInputLast) {
    history.unshift({ front: lastFront.slice(0,5).sort(function(a,b){return a-b}), back: lastBack.slice(0,2).sort(function(a,b){return a-b}) });
  }

  // 当期开奖号码（用于命中对比）
  var actualFront, actualBack;
  if (hasInputLast) {
    actualFront = lastFront.slice(0,5).sort(function(a,b){return a-b});
    actualBack = lastBack.slice(0,2).sort(function(a,b){return a-b});
  } else if (history.length > 0) {
    actualFront = history[0].front;
    actualBack = history[0].back;
  } else {
    alert('请先输入当期开奖号码或历史数据'); return;
  }

  // 用于生成推荐的历史数据（排除当期开奖号码本身，避免信息泄露）
  var genHistory = hasInputLast ? history : history.slice(1);
  if (genHistory.length < 1) { alert('请至少提供1期历史数据用于生成推荐'); return; }

  var last = genHistory[0];
  var allFronts = genHistory.map(function(h){ return h.front; });
  var allBacks = genHistory.map(function(h){ return h.back; });
  var lastDraw = last.front.concat(last.back);
  var hist = allFronts.map(function(f,i){ return f.concat(allBacks[i]); });
  var frontScores = scoreDLTNumbers_V3(lastDraw, hist);
  var backScores = scoreDLTBlueNumbers_V3(lastDraw, hist);

  // 加权随机抽取
  function weightedPick(items, scores, count) {
    var result = [];
    var available = items.slice();
    var scoreMap = {};
    for (var i = 0; i < scores.length; i++) scoreMap[scores[i].num] = scores[i].totalScore + 0.5;
    for (var r = 0; r < count; r++) {
      if (available.length === 0) break;
      var totalW = 0;
      var weights = [];
      for (var i = 0; i < available.length; i++) {
        var w = scoreMap[available[i]] || 1;
        weights.push(w);
        totalW += w;
      }
      var rnd = Math.random() * totalW;
      var cum = 0;
      for (var i = 0; i < available.length; i++) {
        cum += weights[i];
        if (rnd <= cum) {
          result.push(available[i]);
          available.splice(i, 1);
          break;
        }
      }
    }
    return result;
  }

  var allFrontNums = [];
  for (var n = 1; n <= 35; n++) allFrontNums.push(n);
  var allBackNums = [];
  for (var n = 1; n <= 12; n++) allBackNums.push(n);

  var results = [];
  for (var set = 0; set < 5; set++) {
    var frontPicks = weightedPick(allFrontNums, frontScores, 5);
    var backPicks = weightedPick(allBackNums, backScores, 2);
    frontPicks.sort(function(a,b){return a-b;});
    backPicks.sort(function(a,b){return a-b;});
    results.push({ front: frontPicks, back: backPicks });
  }

  // 构建质量分所需的评分映射
  var _frontScoreMap = {};
  frontScores.forEach(function(s){ _frontScoreMap[s.num] = s; });
  var _backScoreMap = {};
  backScores.forEach(function(s){ _backScoreMap[s.num] = s; });
  var qctx = { lastFront: last.front, frontScoreMap: _frontScoreMap, backScoreMap: _backScoreMap };

  var html = '<div style="padding:0.5rem">';
  html += '<div style="text-align:center;margin-bottom:1rem;font-size:0.9rem;color:var(--muted)">';
  html += '基于大模型评分加权抽选，分数越高的号码被摇中的概率越大';
  html += '</div>';
  for (var s = 0; s < results.length; s++) {
    html += '<div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:60px;font-size:0.9rem">第'+(s+1)+'注</span>';
    html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">';
    html += '<span style="font-size:0.75rem;color:var(--muted)">前区</span>';
    results[s].front.forEach(function(n){
      html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+pad(n)+'</div>';
    });
    html += '<span style="font-size:0.75rem;color:var(--muted);margin-left:0.5rem">后区</span>';
    results[s].back.forEach(function(n){
      html += '<div class="ball blue" style="width:34px;height:34px;font-size:0.75rem">'+pad(n)+'</div>';
    });
    // 质量分
    var q = dltQualityScore(results[s].front, results[s].back, qctx);
    html += '<span style="margin-left:auto;background:var(--accent);color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600">质量分 '+q+'</span>';
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('dlt-lottery-results').innerHTML = html;
  document.getElementById('dlt-lottery-results').style.display = 'block';
}

// 双彩结合推荐 - 结合双色球斜连/重号/历史规律
function renderDLTDual() {
  var frontStr = document.getElementById('dlt-front').value;
  var backStr = document.getElementById('dlt-back').value;
  var historyStr = document.getElementById('dlt-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var f = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (f.length >= 5 && b.length >= 2) {
      history.push({ front: f.slice(0, 5).sort(function(a,b){return a-b}), back: b.slice(0, 2).sort(function(a,b){return a-b}) });
    }
  }
  var lastFront = parseNums(frontStr);
  var lastBack = parseNums(backStr);
  if (history.length === 0 && lastFront.length >= 5 && lastBack.length >= 2) {
    history.unshift({ front: lastFront.slice(0,5).sort(function(a,b){return a-b}), back: lastBack.slice(0,2).sort(function(a,b){return a-b}) });
  }
  if (history.length < 2) { return; }

  var last = history[0];
  var allFronts = history.map(function(h){ return h.front; });
  var allBacks = history.map(function(h){ return h.back; });
  var lastDraw = last.front.concat(last.back);
  var hist = allFronts.map(function(f,i){ return f.concat(allBacks[i]); });
  var frontScores = scoreDLTNumbers_V3(lastDraw, hist);
  var backScores = scoreDLTBlueNumbers_V3(lastDraw, hist);

  // 获取双色球最新数据用于斜连分析
  var ssqNums = [];
  try {
    if (typeof ssqSampleHistory !== 'undefined' && ssqSampleHistory.length > 0) {
      ssqNums = ssqSampleHistory[0].split('|')[0].split(',').map(Number);
    }
  } catch(e) {}

  // 双彩融合评分：DLT评分 + 双色球斜连加分
  function dualScore(num) {
    var base = 0;
    for (var i = 0; i < frontScores.length; i++) {
      if (frontScores[i].num === num) {
        base = frontScores[i].totalScore * 100;
        break;
      }
    }
    // 双色球斜连加分
    var crossBonus = 0;
    for (var j = 0; j < ssqNums.length; j++) {
      var diff = Math.abs(num - ssqNums[j]);
      if (diff === 1) crossBonus += 15;
      else if (diff === 2) crossBonus += 10;
      else if (diff === 3) crossBonus += 5;
    }
    // 双色球重号加分（与SSQ相同号码）
    for (var j = 0; j < ssqNums.length; j++) {
      if (num === ssqNums[j]) crossBonus += 20;
    }
    return base + crossBonus;
  }

  var scored = [];
  for (var n = 1; n <= 35; n++) {
    scored.push({ num: n, score: dualScore(n) });
  }
  scored.sort(function(a,b){return b.score - a.score;});

  // 生成5个方案
  var results = [];
  var used = {};
  for (var s = 0; s < 5; s++) {
    var picks = [];
    var zoneCount = [0,0,0];
    for (var i = 0; i < scored.length && picks.length < 5; i++) {
      var n = scored[i].num;
      if (used[n]) continue;
      var z = n <= 12 ? 0 : n <= 23 ? 1 : 2;
      if (zoneCount[z] < 3) {
        // 随机加入一些差异化
        if (Math.random() < 0.7 || s > 0) {
          picks.push(n);
          used[n] = true;
          zoneCount[z]++;
        }
      }
    }
    // 补足
    for (var i = 0; i < scored.length && picks.length < 5; i++) {
      var n = scored[i].num;
      if (!used[n] && picks.indexOf(n) < 0) {
        picks.push(n);
        used[n] = true;
      }
    }
    picks.sort(function(a,b){return a-b;});
    var b = [backScores[0].num, backScores[Math.min(1,backScores.length-1)].num];
    if (s > 0) {
      b = [backScores[Math.min(s % backScores.length, backScores.length-1)].num,
           backScores[Math.min((s+1) % backScores.length, backScores.length-1)].num];
    }
    results.push({ front: picks, back: b });
  }

  var _frontScoreMap2 = {};
  frontScores.forEach(function(s){ _frontScoreMap2[s.num] = s; });
  var _backScoreMap2 = {};
  backScores.forEach(function(s){ _backScoreMap2[s.num] = s; });
  var qctx2 = { lastFront: last.front, frontScoreMap: _frontScoreMap2, backScoreMap: _backScoreMap2 };

  var html = '<div style="padding:0.5rem">';
  html += '<div style="margin-bottom:1rem;font-size:0.8rem;color:var(--muted)">';
  html += '结合双色球最新开奖号: ';
  if (ssqNums.length > 0) {
    html += ssqNums.map(function(n){return pad(n);}).join(', ');
  } else {
    html += '未加载';
  }
  html += ' 的斜连/重号规律进行推荐</div>';

  for (var s = 0; s < results.length; s++) {
    var q = dltQualityScore(results[s].front, results[s].back, qctx2);
    html += '<div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:60px;font-size:0.9rem">第'+(s+1)+'注</span>';
    html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">';
    results[s].front.forEach(function(n){
      html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+pad(n)+'</div>';
    });
    html += '<span style="font-size:0.75rem;color:var(--muted);margin-left:0.5rem">+</span>';
    results[s].back.forEach(function(n){
      html += '<div class="ball blue" style="width:34px;height:34px;font-size:0.75rem">'+pad(n)+'</div>';
    });
    html += '<span style="margin-left:auto;background:'+(q>=85?'var(--accent3)':(q>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600">质量分 '+q+'</span>';
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('dlt-dual-results').innerHTML = html;
}

// 机选复盘分析
function spinDLTReview() {
  var frontStr = document.getElementById('dlt-front').value;
  var backStr = document.getElementById('dlt-back').value;
  var historyStr = document.getElementById('dlt-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var f = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (f.length >= 5 && b.length >= 2) {
      history.push({ front: f.slice(0, 5).sort(function(a,b){return a-b}), back: b.slice(0, 2).sort(function(a,b){return a-b}) });
    }
  }
  var lastFront = parseNums(frontStr);
  var lastBack = parseNums(backStr);
  var hasInputLast = lastFront.length >= 5 && lastBack.length >= 2;
  if (history.length === 0 && hasInputLast) {
    history.unshift({ front: lastFront.slice(0,5).sort(function(a,b){return a-b}), back: lastBack.slice(0,2).sort(function(a,b){return a-b}) });
  }

  // 当期开奖号码（用于命中对比）
  var actualFront, actualBack;
  if (hasInputLast) {
    actualFront = lastFront.slice(0,5).sort(function(a,b){return a-b});
    actualBack = lastBack.slice(0,2).sort(function(a,b){return a-b});
  } else if (history.length > 0) {
    actualFront = history[0].front;
    actualBack = history[0].back;
  } else {
    alert('请先输入当期开奖号码或历史数据'); return;
  }

  if (history.length < 2) { alert('请先加载数据进行分析'); return; }

  var last = history[0];
  var allFronts = history.map(function(h){ return h.front; });
  var allBacks = history.map(function(h){ return h.back; });
  var lastDraw = last.front.concat(last.back);
  var hist = allFronts.map(function(f,i){ return f.concat(allBacks[i]); });
  var frontScores = scoreDLTNumbers_V3(lastDraw, hist);
  var backScores = scoreDLTBlueNumbers_V3(lastDraw, hist);

  // 获取SSQ数据
  var ssqNums = [];
  try {
    if (typeof ssqSampleHistory !== 'undefined' && ssqSampleHistory.length > 0) {
      ssqNums = ssqSampleHistory[0].split('|')[0].split(',').map(Number);
    }
  } catch(e) {}

  // 双彩融合评分
  function dualScore(num) {
    var base = 0;
    for (var i = 0; i < frontScores.length; i++) {
      if (frontScores[i].num === num) {
        base = frontScores[i].totalScore * 100;
        break;
      }
    }
    var crossBonus = 0;
    for (var j = 0; j < ssqNums.length; j++) {
      var diff = Math.abs(num - ssqNums[j]);
      if (diff === 1) crossBonus += 15;
      else if (diff === 2) crossBonus += 10;
      else if (diff === 3) crossBonus += 5;
    }
    for (var j = 0; j < ssqNums.length; j++) {
      if (num === ssqNums[j]) crossBonus += 20;
    }
    return base + crossBonus;
  }

  var scored = [];
  for (var n = 1; n <= 35; n++) scored.push({ num: n, score: dualScore(n) });
  scored.sort(function(a,b){return b.score - a.score;});

  // 机选5注
  var results = [];
  var used = {};
  for (var s = 0; s < 5; s++) {
    var picks = [];
    var zoneCount = [0,0,0];
    for (var i = 0; i < scored.length && picks.length < 5; i++) {
      var n = scored[i].num;
      if (used[n]) continue;
      var z = n <= 12 ? 0 : n <= 23 ? 1 : 2;
      if (zoneCount[z] < 3 && Math.random() < 0.75) {
        picks.push(n);
        used[n] = true;
        zoneCount[z]++;
      }
    }
    for (var i = 0; i < scored.length && picks.length < 5; i++) {
      var n = scored[i].num;
      if (!used[n] && picks.indexOf(n) < 0) { picks.push(n); used[n] = true; }
    }
    picks.sort(function(a,b){return a-b;});
    var b = [backScores[Math.min(s % backScores.length, backScores.length-1)].num,
             backScores[Math.min((s+1) % backScores.length, backScores.length-1)].num];
    b.sort(function(a,b){return a-b;});
    results.push({ front: picks, back: b });
  }

  var _frontScoreMap3 = {};
  frontScores.forEach(function(s){ _frontScoreMap3[s.num] = s; });
  var _backScoreMap3 = {};
  backScores.forEach(function(s){ _backScoreMap3[s.num] = s; });
  var qctx3 = { lastFront: last.front, frontScoreMap: _frontScoreMap3, backScoreMap: _backScoreMap3 };

  // 分析命中（与当期开奖号码对比）
  var html = '<div style="padding:0.5rem">';
  html += '<div style="margin-bottom:1rem;font-size:0.8rem;color:var(--muted)">';
  html += '当期开奖：前区 ';
  actualFront.forEach(function(n){ html += '<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:var(--accent4);color:#fff;text-align:center;font-size:0.7rem;margin:0 2px">'+pad(n)+'</span>'; });
  html += ' 后区 ';
  actualBack.forEach(function(n){ html += '<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:var(--accent2);color:#fff;text-align:center;font-size:0.7rem;margin:0 2px">'+pad(n)+'</span>'; });
  html += '</div>';

  for (var s = 0; s < results.length; s++) {
    var frontHits = results[s].front.filter(function(n){ return actualFront.indexOf(n) >= 0; });
    var backHits = results[s].back.filter(function(n){ return actualBack.indexOf(n) >= 0; });
    var q = dltQualityScore(results[s].front, results[s].back, qctx3);
    html += '<div style="padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:50px;font-size:0.9rem">第'+(s+1)+'注</span>';
    results[s].front.forEach(function(n){
      html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+pad(n)+'</div>';
    });
    html += '<span style="font-size:0.75rem;color:var(--muted)">+</span>';
    results[s].back.forEach(function(n){
      html += '<div class="ball blue" style="width:34px;height:34px;font-size:0.75rem">'+pad(n)+'</div>';
    });
    html += '<span style="margin-left:auto;background:'+(q>=85?'var(--accent3)':(q>=70?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600">质量分 '+q+'</span>';
    html += '</div>';
    // 分析理由
    html += '<div style="margin-top:0.3rem;font-size:0.7rem;color:var(--muted)">';
    var reasons = [];
    results[s].front.forEach(function(n){
      for (var i = 0; i < frontScores.length; i++) {
        if (frontScores[i].num === n) {
          var r = [];
          if (frontScores[i].wf > 0.2) r.push('高频');
          if (frontScores[i].mp > 0.8) r.push('深冷回补');
          if (frontScores[i].mkScore > 0.7) r.push('冷转热');
          if (frontScores[i].neighborScore > 0.7) r.push('邻号');
          if (frontScores[i].diagonalScore > 0.7) r.push('斜连');
          if (r.length > 0) reasons.push(pad(n)+'('+r.join('·')+')');
          break;
        }
      }
    });
    if (reasons.length > 0) html += '分析：'+reasons.join('，');
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('dlt-review-analysis').innerHTML = html;
}

// 使用双色球数据填充大乐透Tab2/Tab5/Tab6的额外分析
function renderDLTProbAnalysis() {
  var frontStr = document.getElementById('dlt-front').value;
  var backStr = document.getElementById('dlt-back').value;
  var historyStr = document.getElementById('dlt-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var f = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (f.length >= 5 && b.length >= 2) {
      history.push({ front: f.slice(0, 5).sort(function(a,b){return a-b}), back: b.slice(0, 2).sort(function(a,b){return a-b}) });
    }
  }
  var lastFront = parseNums(frontStr);
  var lastBack = parseNums(backStr);
  if (history.length === 0 && lastFront.length >= 5 && lastBack.length >= 2) {
    history.unshift({ front: lastFront.slice(0,5).sort(function(a,b){return a-b}), back: lastBack.slice(0,2).sort(function(a,b){return a-b}) });
  }
  if (history.length < 2) return;

  var last = history[0];
  var allFronts = history.map(function(h){ return h.front; });
  var allBacks = history.map(function(h){ return h.back; });
  var lastDraw = last.front.concat(last.back);
  var hist = allFronts.map(function(f,i){ return f.concat(allBacks[i]); });
  var frontScores = scoreDLTNumbers_V3(lastDraw, hist);
  var backScores = scoreDLTBlueNumbers_V3(lastDraw, hist);

  // Tab2: 前区Top15评分
  var top15 = frontScores.slice(0, 15);
  var html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  html += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">号码</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">频率</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">遗漏</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">遗漏%位</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">周期驱动</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">邻号</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">斜连</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">总评分</th></tr></thead><tbody>';
  top15.forEach(function(s){
    html += '<tr><td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent4)">'+pad(s.num)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.wf*100).toFixed(1)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+s.currentGap+'期</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mp*100).toFixed(0)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mkScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.neighborScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.diagonalScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent)">'+(s.totalScore*100).toFixed(1)+'</td></tr>';
  });
  html += '</tbody></table></div>';
  document.getElementById('dlt-prob-front').innerHTML = html;

  // Tab2: 后区Top8评分
  var top8 = backScores.slice(0, 8);
  html = '<div style="display:flex;gap:0.6rem;flex-wrap:wrap">';
  top8.forEach(function(s){
    html += '<div style="padding:0.6rem 1rem;border:1px solid var(--rule);border-radius:6px;background:var(--bg2);text-align:center;min-width:80px">';
    html += '<div style="font-weight:bold;color:var(--accent2);font-size:1.1rem">'+pad(s.num)+'</div>';
    html += '<div style="color:var(--muted);font-size:0.7rem">'+(s.totalScore*100).toFixed(1)+'分</div>';
    html += '<div style="color:var(--muted);font-size:0.65rem">遗漏'+s.currentGap+'期</div>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('dlt-prob-back').innerHTML = html;

  // Tab2: 重号分析
  try { renderDLTRepeat(last, history); } catch(e) {}
  // 重号分析内容复制到dlt-prob-repeat
  var repeatHtml = document.getElementById('dlt-repeat').innerHTML;
  if (repeatHtml) document.getElementById('dlt-prob-repeat').innerHTML = repeatHtml;

  // Tab2: 斜连号分析
  var dhtml = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  dhtml += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">号码</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">斜连分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">邻号分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">跨彩种斜连</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">说明</th></tr></thead><tbody>';
  var diagonalTop = frontScores.slice().sort(function(a,b){return (b.diagonalScore||0) - (a.diagonalScore||0);}).slice(0, 10);
  var ssqNums = [];
  try { if (typeof ssqSampleHistory !== 'undefined' && ssqSampleHistory.length > 0) { ssqNums = ssqSampleHistory[0].split('|')[0].split(',').map(Number); } } catch(e) {}
  diagonalTop.forEach(function(s){
    if ((s.diagonalScore||0) < 0.5) return;
    var crossNote = '';
    for (var j = 0; j < ssqNums.length; j++) {
      var diff = Math.abs(s.num - ssqNums[j]);
      if (diff <= 2) { crossNote = 'SSQ斜连'+pad(ssqNums[j])+'('+diff+')'; break; }
    }
    dhtml += '<tr><td style="padding:4px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--ink)">'+pad(s.num)+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.diagonalScore*100).toFixed(0)+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.neighborScore*100).toFixed(0)+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(crossNote||'-')+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);color:var(--muted);font-size:0.7rem">'+(s.diagonalScore>0.7?'强斜连':'中斜连')+'</td></tr>';
  });
  dhtml += '</tbody></table></div>';
  document.getElementById('dlt-prob-diagonal').innerHTML = dhtml;
}

// ==================== 双色球新功能模块 ====================

// 摇奖机模拟选号
function spinSSQLottery() {
  var redStr = document.getElementById('ssq-red').value;
  var blueStr = document.getElementById('ssq-blue').value;
  var historyStr = document.getElementById('ssq-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var r = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (r.length >= 6 && b.length >= 1) {
      history.push({ red: r.slice(0,6).sort(function(a,b){return a-b}), blue: b[0] });
    }
  }
  var lastRed = parseNums(redStr);
  var lastBlue = parseNums(blueStr);
  var hasInputLast = lastRed.length >= 6 && lastBlue.length >= 1;
  if (history.length === 0 && hasInputLast) {
    history.unshift({ red: lastRed.slice(0,6).sort(function(a,b){return a-b}), blue: lastBlue[0] });
  }

  // 当期开奖号码（用于命中对比）
  var actualRed, actualBlue;
  if (hasInputLast) {
    actualRed = lastRed.slice(0,6).sort(function(a,b){return a-b});
    actualBlue = lastBlue[0];
  } else if (history.length > 0) {
    actualRed = history[0].red;
    actualBlue = history[0].blue;
  } else {
    alert('请先输入当期开奖号码或历史数据'); return;
  }

  // 用于生成推荐的历史数据（排除当期开奖号码本身，避免信息泄露）
  var genHistory = hasInputLast ? history : history.slice(1);
  if (genHistory.length < 1) { alert('请至少提供1期历史数据用于生成推荐'); return; }

  var last = genHistory[0];
  var allReds = genHistory.map(function(h){ return h.red; });
  var allBlues = genHistory.map(function(h){ return h.blue; });
  var redScores = scoreSSQNumbers(last, allReds);
  var blueScores = scoreSSQBlueNumbers(last, allBlues);

  function weightedPick(items, scores, count) {
    var result = [];
    var available = items.slice();
    var scoreMap = {};
    for (var i = 0; i < scores.length; i++) scoreMap[scores[i].num] = scores[i].totalScore + 0.5;
    for (var r = 0; r < count; r++) {
      if (available.length === 0) break;
      var totalW = 0;
      var weights = [];
      for (var i = 0; i < available.length; i++) {
        var w = scoreMap[available[i]] || 1;
        weights.push(w);
        totalW += w;
      }
      var rnd = Math.random() * totalW;
      var cum = 0;
      for (var i = 0; i < available.length; i++) {
        cum += weights[i];
        if (rnd <= cum) {
          result.push(available[i]);
          available.splice(i, 1);
          break;
        }
      }
    }
    return result;
  }

  var allRedNums = [];
  for (var n = 1; n <= 33; n++) allRedNums.push(n);
  var allBlueNums = [];
  for (var n = 1; n <= 16; n++) allBlueNums.push(n);

  var results = [];
  for (var set = 0; set < 5; set++) {
    var redPicks = weightedPick(allRedNums, redScores, 6);
    var bluePicks = weightedPick(allBlueNums, blueScores, 1);
    redPicks.sort(function(a,b){return a-b;});
    results.push({ red: redPicks, blue: bluePicks[0] });
  }

  var _redScoreMap = {};
  redScores.forEach(function(s){ _redScoreMap[s.num] = s; });

  var html = '<div style="padding:0.5rem">';
  html += '<div style="text-align:center;margin-bottom:1rem;font-size:0.9rem;color:var(--muted)">基于大模型评分加权抽选，分数越高的号码被摇中的概率越大</div>';
  for (var s = 0; s < results.length; s++) {
    // 胆码：评分最高的2个
    var scoredReds = results[s].red.map(function(n){
      var sc = _redScoreMap[n];
      return {num: n, score: sc ? sc.totalScore : 0};
    }).sort(function(a,b){return b.score - a.score;});
    var danNums = scoredReds.slice(0,2).map(function(x){return x.num;});

    html += '<div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:60px;font-size:0.9rem">第'+(s+1)+'注</span>';
    html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">';
    html += '<span style="font-size:0.75rem;color:var(--muted)">红球</span>';
    results[s].red.forEach(function(n){
      var isDan = danNums.indexOf(n) >= 0;
      html += '<div class="ball '+(isDan?'gold':'red')+'" style="width:34px;height:34px;font-size:0.75rem;'+(isDan?'box-shadow:0 0 8px rgba(245,158,11,0.6);':'')+'">'+pad(n)+'</div>';
    });
    html += '<span style="font-size:0.75rem;color:var(--muted);margin-left:0.5rem">蓝球</span>';
    html += '<div class="ball blue" style="width:34px;height:34px;font-size:0.75rem">'+pad(results[s].blue)+'</div>';
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('ssq-lottery-results').innerHTML = html;
  document.getElementById('ssq-lottery-results').style.display = 'block';
}

// 双彩结合推荐 - 结合大乐透规律
function renderSSQDual() {
  var redStr = document.getElementById('ssq-red').value;
  var blueStr = document.getElementById('ssq-blue').value;
  var historyStr = document.getElementById('ssq-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var r = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (r.length >= 6 && b.length >= 1) {
      history.push({ red: r.slice(0,6).sort(function(a,b){return a-b}), blue: b[0] });
    }
  }
  var lastRed = parseNums(redStr);
  var lastBlue = parseNums(blueStr);
  if (history.length === 0 && lastRed.length >= 6 && lastBlue.length >= 1) {
    history.unshift({ red: lastRed.slice(0,6).sort(function(a,b){return a-b}), blue: lastBlue[0] });
  }
  if (history.length < 2) { return; }

  var last = history[0];
  var allReds = history.map(function(h){ return h.red; });
  var allBlues = history.map(function(h){ return h.blue; });
  var redScores = scoreSSQNumbers(last, allReds);
  var blueScores = scoreSSQBlueNumbers(last, allBlues);

  // 获取大乐透最新数据
  var dltNums = [];
  try {
    if (typeof dltSampleHistory !== 'undefined' && dltSampleHistory.length > 0) {
      dltNums = dltSampleHistory[0].split('|')[0].split(',').map(Number);
    }
  } catch(e) {}

  // 大乐透连号检测
  var dltPairs = [];
  for (var i = 0; i < dltNums.length - 1; i++) {
    if (dltNums[i+1] - dltNums[i] === 1) {
      dltPairs.push([dltNums[i], dltNums[i+1]]);
    }
  }

  function dualScore(num) {
    var base = 0;
    for (var i = 0; i < redScores.length; i++) {
      if (redScores[i].num === num) {
        base = redScores[i].totalScore * 100;
        break;
      }
    }
    // DLT斜连加分
    var crossBonus = 0;
    for (var j = 0; j < dltNums.length; j++) {
      var diff = Math.abs(num - dltNums[j]);
      if (diff === 1) crossBonus += 12;
      else if (diff === 2) crossBonus += 8;
      else if (diff === 3) crossBonus += 4;
    }
    // DLT重号加分
    for (var j = 0; j < dltNums.length; j++) {
      if (num === dltNums[j]) crossBonus += 18;
    }
    // DLT连号邻号加分（如果DLT有连号，SSQ邻号加分）
    for (var p = 0; p < dltPairs.length; p++) {
      var pair = dltPairs[p];
      if (Math.abs(num - pair[0]) <= 1 || Math.abs(num - pair[1]) <= 1) {
        crossBonus += 6;
      }
    }
    return base + crossBonus;
  }

  var scored = [];
  for (var n = 1; n <= 33; n++) scored.push({ num: n, score: dualScore(n) });
  scored.sort(function(a,b){return b.score - a.score;});

  var results = [];
  var used = {};
  for (var s = 0; s < 5; s++) {
    var picks = [];
    var zoneCount = [0,0,0];
    var usedTails = {};
    for (var i = 0; i < scored.length && picks.length < 6; i++) {
      var n = scored[i].num;
      if (used[n]) continue;
      var z = n <= 11 ? 0 : n <= 22 ? 1 : 2;
      var tail = n % 10;
      if (zoneCount[z] < 3 && (usedTails[tail] || 0) < 2 && Math.random() < 0.75) {
        picks.push(n);
        used[n] = true;
        zoneCount[z]++;
        usedTails[tail] = (usedTails[tail] || 0) + 1;
      }
    }
    for (var i = 0; i < scored.length && picks.length < 6; i++) {
      var n = scored[i].num;
      if (!used[n] && picks.indexOf(n) < 0) { picks.push(n); used[n] = true; }
    }
    picks.sort(function(a,b){return a-b;});
    var b = blueScores[s % blueScores.length].num;
    results.push({ red: picks, blue: b });
  }

  var html = '<div style="padding:0.5rem">';
  html += '<div style="margin-bottom:1rem;font-size:0.8rem;color:var(--muted)">';
  html += '结合大乐透最新开奖号: ';
  if (dltNums.length > 0) {
    html += dltNums.map(function(n){return pad(n);}).join(', ');
  } else { html += '未加载'; }
  if (dltPairs.length > 0) {
    html += ' （连号: ' + dltPairs.map(function(p){return pad(p[0])+'-'+pad(p[1]);}).join(', ') + '）';
  }
  html += '</div>';

  for (var s = 0; s < results.length; s++) {
    html += '<div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:60px;font-size:0.9rem">第'+(s+1)+'注</span>';
    html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">';
    results[s].red.forEach(function(n){
      html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem">'+pad(n)+'</div>';
    });
    html += '<span style="font-size:0.75rem;color:var(--muted);margin-left:0.5rem">+</span>';
    html += '<div class="ball blue" style="width:34px;height:34px;font-size:0.75rem">'+pad(results[s].blue)+'</div>';
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('ssq-dual-results').innerHTML = html;
}

// 机选复盘分析
function spinSSQReview() {
  var redStr = document.getElementById('ssq-red').value;
  var blueStr = document.getElementById('ssq-blue').value;
  var historyStr = document.getElementById('ssq-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var r = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (r.length >= 6 && b.length >= 1) {
      history.push({ red: r.slice(0,6).sort(function(a,b){return a-b}), blue: b[0] });
    }
  }
  var lastRed = parseNums(redStr);
  var lastBlue = parseNums(blueStr);
  var hasInputLast = lastRed.length >= 6 && lastBlue.length >= 1;
  if (history.length === 0 && hasInputLast) {
    history.unshift({ red: lastRed.slice(0,6).sort(function(a,b){return a-b}), blue: lastBlue[0] });
  }

  // 当期开奖号码（用于命中对比）
  var actualRed, actualBlue;
  if (hasInputLast) {
    actualRed = lastRed.slice(0,6).sort(function(a,b){return a-b});
    actualBlue = lastBlue[0];
  } else if (history.length > 0) {
    actualRed = history[0].red;
    actualBlue = history[0].blue;
  } else {
    alert('请先输入当期开奖号码或历史数据'); return;
  }

  if (history.length < 2) { alert('请先加载数据进行分析'); return; }

  var last = history[0];
  var allReds = history.map(function(h){ return h.red; });
  var allBlues = history.map(function(h){ return h.blue; });
  var redScores = scoreSSQNumbers(last, allReds);
  var blueScores = scoreSSQBlueNumbers(last, allBlues);

  // DLT数据
  var dltNums = [];
  try {
    if (typeof dltSampleHistory !== 'undefined' && dltSampleHistory.length > 0) {
      dltNums = dltSampleHistory[0].split('|')[0].split(',').map(Number);
    }
  } catch(e) {}

  function dualScore(num) {
    var base = 0;
    for (var i = 0; i < redScores.length; i++) {
      if (redScores[i].num === num) { base = redScores[i].totalScore * 100; break; }
    }
    var crossBonus = 0;
    for (var j = 0; j < dltNums.length; j++) {
      var diff = Math.abs(num - dltNums[j]);
      if (diff === 1) crossBonus += 12;
      else if (diff === 2) crossBonus += 8;
      else if (diff === 3) crossBonus += 4;
    }
    for (var j = 0; j < dltNums.length; j++) {
      if (num === dltNums[j]) crossBonus += 18;
    }
    return base + crossBonus;
  }

  var scored = [];
  for (var n = 1; n <= 33; n++) scored.push({ num: n, score: dualScore(n) });
  scored.sort(function(a,b){return b.score - a.score;});

  var results = [];
  var used = {};
  for (var s = 0; s < 5; s++) {
    var picks = [];
    var zoneCount = [0,0,0];
    for (var i = 0; i < scored.length && picks.length < 6; i++) {
      var n = scored[i].num;
      if (used[n]) continue;
      var z = n <= 11 ? 0 : n <= 22 ? 1 : 2;
      if (zoneCount[z] < 3 && Math.random() < 0.75) {
        picks.push(n); used[n] = true; zoneCount[z]++;
      }
    }
    for (var i = 0; i < scored.length && picks.length < 6; i++) {
      var n = scored[i].num;
      if (!used[n] && picks.indexOf(n) < 0) { picks.push(n); used[n] = true; }
    }
    picks.sort(function(a,b){return a-b;});
    var b = blueScores[s % blueScores.length].num;
    results.push({ red: picks, blue: b });
  }

  var html = '<div style="padding:0.5rem">';
  html += '<div style="margin-bottom:1rem;font-size:0.8rem;color:var(--muted)">';
  html += '当期开奖：红球 ';
  actualRed.forEach(function(n){ html += '<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:var(--accent4);color:#fff;text-align:center;font-size:0.7rem;margin:0 2px">'+pad(n)+'</span>'; });
  html += ' 蓝球 ';
  html += '<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:var(--accent2);color:#fff;text-align:center;font-size:0.7rem;margin:0 2px">'+pad(actualBlue)+'</span>';
  html += '</div>';

  for (var s = 0; s < results.length; s++) {
    var redHits = results[s].red.filter(function(n){ return actualRed.indexOf(n) >= 0; });
    var blueHit = actualBlue === results[s].blue ? 1 : 0;
    html += '<div style="padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:50px;font-size:0.9rem">第'+(s+1)+'注</span>';
    results[s].red.forEach(function(n){
      var isHit = actualRed.indexOf(n) >= 0;
      html += '<div class="ball red" style="width:34px;height:34px;font-size:0.75rem;'+(isHit?'box-shadow:0 0 0 2px var(--accent3);':'')+'">'+pad(n)+'</div>';
    });
    html += '<span style="font-size:0.75rem;color:var(--muted)">+</span>';
    var bHit = actualBlue === results[s].blue;
    html += '<div class="ball blue" style="width:34px;height:34px;font-size:0.75rem;'+(bHit?'box-shadow:0 0 0 2px var(--accent3);':'')+'">'+pad(results[s].blue)+'</div>';
    html += '<span style="margin-left:auto;background:'+(redHits.length+blueHit>=4?'var(--accent3)':(redHits.length+blueHit>=2?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600">红球'+redHits.length+'+蓝球'+blueHit+'</span>';
    html += '</div>';
    if (redHits.length > 0 || blueHit > 0) {
      html += '<div style="margin-top:0.3rem;font-size:0.7rem;color:var(--muted)">命中：'+redHits.map(function(n){return pad(n);}).join(', ')+(blueHit ? ' + '+pad(actualBlue) : '')+'</div>';
    }
    // 分析理由
    html += '<div style="margin-top:0.3rem;font-size:0.7rem;color:var(--muted)">';
    var reasons = [];
    results[s].red.forEach(function(n){
      for (var i = 0; i < redScores.length; i++) {
        if (redScores[i].num === n) {
          var r = [];
          if (redScores[i].wf > 0.2) r.push('高频');
          if (redScores[i].mp > 0.8) r.push('深冷回补');
          if (redScores[i].mkScore > 0.8) r.push('冷转热');
          if (redScores[i].neighborScore > 0.7) r.push('邻号');
          if (redScores[i].pairScore > 0.5) r.push('连号');
          if (dltNums.indexOf(n) >= 0) r.push('DLT重号');
          for (var j = 0; j < dltNums.length; j++) {
            if (Math.abs(n - dltNums[j]) === 1) { r.push('DLT斜连'+pad(dltNums[j])); break; }
          }
          if (r.length > 0) reasons.push(pad(n)+'('+r.join('·')+')');
          break;
        }
      }
    });
    if (reasons.length > 0) html += '分析：'+reasons.join('，');
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('ssq-review-analysis').innerHTML = html;
}

// 大模型统计概率分析
function renderSSQProbAnalysis() {
  var redStr = document.getElementById('ssq-red').value;
  var blueStr = document.getElementById('ssq-blue').value;
  var historyStr = document.getElementById('ssq-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var r = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (r.length >= 6 && b.length >= 1) {
      history.push({ red: r.slice(0,6).sort(function(a,b){return a-b}), blue: b[0] });
    }
  }
  var lastRed = parseNums(redStr);
  var lastBlue = parseNums(blueStr);
  if (history.length === 0 && lastRed.length >= 6 && lastBlue.length >= 1) {
    history.unshift({ red: lastRed.slice(0,6).sort(function(a,b){return a-b}), blue: lastBlue[0] });
  }
  if (history.length < 2) return;

  var last = history[0];
  var allReds = history.map(function(h){ return h.red; });
  var allBlues = history.map(function(h){ return h.blue; });
  var redScores = scoreSSQNumbers(last, allReds);
  var blueScores = scoreSSQBlueNumbers(last, allBlues);

  // DLT数据
  var dltNums = [];
  try {
    if (typeof dltSampleHistory !== 'undefined' && dltSampleHistory.length > 0) {
      dltNums = dltSampleHistory[0].split('|')[0].split(',').map(Number);
    }
  } catch(e) {}

  // Tab2: 红球Top15评分表
  var top15 = redScores.slice(0, 15);
  var html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  html += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">号码</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">频率</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">遗漏</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">遗漏%位</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">周期驱动</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">邻号</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">连号</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">总评分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">理由</th></tr></thead><tbody>';
  top15.forEach(function(s){
    var reason = [];
    if (s.wf > 0.2) reason.push('高频');
    if (s.mp > 0.8) reason.push('深冷');
    if (s.mkScore > 0.8) reason.push('冷转热');
    if (s.neighborScore > 0.7) reason.push('邻号');
    if (s.pairScore > 0.5) reason.push('连号');
    html += '<tr><td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent4)">'+pad(s.num)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.wf*100).toFixed(1)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+s.currentGap+'期</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mp*100).toFixed(0)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.mkScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.neighborScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.pairScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent)">'+(s.totalScore*100).toFixed(1)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(reason.join('·')||'-')+'</td></tr>';
  });
  html += '</tbody></table></div>';
  document.getElementById('ssq-prob-red').innerHTML = html;

  // Tab2: 蓝球Top6
  var top6 = blueScores.slice(0, 6);
  html = '<div style="display:flex;gap:0.6rem;flex-wrap:wrap">';
  top6.forEach(function(s){
    html += '<div style="padding:0.6rem 1rem;border:1px solid var(--rule);border-radius:6px;background:var(--bg2);text-align:center;min-width:80px">';
    html += '<div style="font-weight:bold;color:var(--accent2);font-size:1.1rem">'+pad(s.num)+'</div>';
    html += '<div style="color:var(--muted);font-size:0.7rem">'+(s.totalScore*100).toFixed(1)+'分</div>';
    html += '<div style="color:var(--muted);font-size:0.65rem">遗漏'+s.currentGap+'期</div>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('ssq-prob-blue').innerHTML = html;

  // Tab2: 重号分析
  try { renderSSQRepeat(last, history); } catch(e) {}
  var repeatHtml = document.getElementById('ssq-repeat').innerHTML;
  if (repeatHtml) document.getElementById('ssq-prob-repeat').innerHTML = repeatHtml;

  // Tab2: 斜连分析
  var dhtml = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  dhtml += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">号码</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">邻号分</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">跨彩种斜连</th><th style="padding:6px;border:1px solid var(--rule);color:var(--ink)">说明</th></tr></thead><tbody>';
  var diagonalTop = redScores.slice().sort(function(a,b){return (b.neighborScore||0) - (a.neighborScore||0);}).slice(0, 10);
  diagonalTop.forEach(function(s){
    if ((s.neighborScore||0) < 0.5) return;
    var crossNote = '';
    for (var j = 0; j < dltNums.length; j++) {
      var diff = Math.abs(s.num - dltNums[j]);
      if (diff <= 2) { crossNote = 'DLT斜连'+pad(dltNums[j])+'('+diff+')'; break; }
    }
    dhtml += '<tr><td style="padding:4px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--ink)">'+pad(s.num)+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(s.neighborScore*100).toFixed(0)+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);text-align:center;color:var(--ink)">'+(crossNote||'-')+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);color:var(--muted);font-size:0.7rem">'+(s.neighborScore>0.7?'强邻号':'中邻号')+'</td></tr>';
  });
  dhtml += '</tbody></table></div>';
  document.getElementById('ssq-prob-diagonal').innerHTML = dhtml;

  // Tab2: DLT连号映射
  var phtml = '<div style="font-size:0.8rem;color:var(--muted)">';
  if (dltNums.length > 0) {
    phtml += '大乐透最新前区: ' + dltNums.map(function(n){return pad(n);}).join(', ') + '<br>';
    var dltPairList = [];
    for (var i = 0; i < dltNums.length - 1; i++) {
      if (dltNums[i+1] - dltNums[i] === 1) dltPairList.push([dltNums[i], dltNums[i+1]]);
    }
    if (dltPairList.length > 0) {
      phtml += ' detected 连号: ' + dltPairList.map(function(p){return pad(p[0])+'-'+pad(p[1]);}).join(', ') + '<br>';
      phtml += '<div style="margin-top:0.5rem">对应双色球邻号关注: ';
      var watchNums = [];
      dltPairList.forEach(function(p){
        [p[0]-1, p[0], p[0]+1, p[1]-1, p[1], p[1]+1].forEach(function(n){
          if (n >= 1 && n <= 33 && watchNums.indexOf(n) < 0) watchNums.push(n);
        });
      });
      watchNums.sort(function(a,b){return a-b;});
      phtml += watchNums.map(function(n){return pad(n);}).join(', ');
      phtml += '</div>';
    } else {
      phtml += '大乐透本期无连号</div>';
    }
  } else {
    phtml += '未加载大乐透数据</div>';
  }
  document.getElementById('ssq-prob-dlt-pair').innerHTML = phtml;
}

// ==================== 快乐8新功能模块 ====================

function renderKL8ProbAnalysis() {
  var numsStr = document.getElementById('kl8-numbers').value;
  var historyStr = document.getElementById('kl8-history').value;
  var lastNums = parseNums(numsStr);
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 10) history.push(nums.slice(0,20).sort(function(a,b){return a-b;}));
  }
  if (history.length === 0 && lastNums.length >= 10) {
    history.unshift(lastNums.slice(0,20).sort(function(a,b){return a-b;}));
  }
  if (history.length < 2) return;

  var last = history[0];
  var scores = scoreKL8Numbers(last, history);

  // Top20评分表
  var top20 = scores.slice(0, 20);
  var html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  html += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule)">号码</th><th style="padding:6px;border:1px solid var(--rule)">频率</th><th style="padding:6px;border:1px solid var(--rule)">遗漏</th><th style="padding:6px;border:1px solid var(--rule)">遗漏%位</th><th style="padding:6px;border:1px solid var(--rule)">邻号</th><th style="padding:6px;border:1px solid var(--rule)">区间</th><th style="padding:6px;border:1px solid var(--rule)">总评分</th></tr></thead><tbody>';
  top20.forEach(function(s){
    html += '<tr><td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent4)">'+pad(s.num)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center">'+(s.wf*100).toFixed(1)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center">'+s.currentGap+'期</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center">'+(s.mp*100).toFixed(0)+'%</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center">'+(s.neighborScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center">'+(s.zoneScore*100).toFixed(0)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;font-weight:bold;color:var(--accent)">'+(s.totalScore*100).toFixed(1)+'</td></tr>';
  });
  html += '</tbody></table></div>';
  document.getElementById('kl8-prob-nums').innerHTML = html;

  // 重号分析
  try { renderKL8Repeat(last, history); } catch(e) {}
  var repeatHtml = document.getElementById('kl8-repeat').innerHTML;
  if (repeatHtml) document.getElementById('kl8-prob-repeat').innerHTML = repeatHtml;

  // 斜连分析
  var dhtml = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  dhtml += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule)">号码</th><th style="padding:6px;border:1px solid var(--rule)">邻号分</th><th style="padding:6px;border:1px solid var(--rule)">说明</th></tr></thead><tbody>';
  var diagTop = scores.slice().sort(function(a,b){return (b.neighborScore||0) - (a.neighborScore||0);}).slice(0, 10);
  diagTop.forEach(function(s){
    if ((s.neighborScore||0) < 0.5) return;
    dhtml += '<tr><td style="padding:4px;border:1px solid var(--rule);text-align:center;font-weight:bold">'+pad(s.num)+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);text-align:center">'+(s.neighborScore*100).toFixed(0)+'</td>';
    dhtml += '<td style="padding:4px;border:1px solid var(--rule);color:var(--muted);font-size:0.7rem">'+(s.neighborScore>0.7?'强邻号':'中邻号')+'</td></tr>';
  });
  dhtml += '</tbody></table></div>';
  document.getElementById('kl8-prob-diagonal').innerHTML = dhtml;

  // 区间分析
  try { renderKL8Zone(history); } catch(e) {}
  var zoneHtml = document.getElementById('kl8-zone').innerHTML;
  if (zoneHtml) document.getElementById('kl8-prob-zone').innerHTML = zoneHtml;
}

function spinKL8Lottery() {
  var numsStr = document.getElementById('kl8-numbers').value;
  var historyStr = document.getElementById('kl8-history').value;
  var lastNums = parseNums(numsStr);
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 10) history.push(nums.slice(0,20).sort(function(a,b){return a-b;}));
  }
  if (history.length === 0 && lastNums.length >= 10) {
    history.unshift(lastNums.slice(0,20).sort(function(a,b){return a-b;}));
  }
  if (history.length < 2) { alert('请先加载数据进行分析'); return; }

  var last = history[0];
  var scores = scoreKL8Numbers(last, history);

  function weightedPick(items, scores, count) {
    var result = [];
    var available = items.slice();
    var scoreMap = {};
    for (var i = 0; i < scores.length; i++) scoreMap[scores[i].num] = scores[i].totalScore + 0.5;
    for (var r = 0; r < count; r++) {
      if (available.length === 0) break;
      var totalW = 0;
      var weights = [];
      for (var i = 0; i < available.length; i++) {
        var w = scoreMap[available[i]] || 1;
        weights.push(w);
        totalW += w;
      }
      var rnd = Math.random() * totalW;
      var cum = 0;
      for (var i = 0; i < available.length; i++) {
        cum += weights[i];
        if (rnd <= cum) {
          result.push(available[i]);
          available.splice(i, 1);
          break;
        }
      }
    }
    return result;
  }

  var allNums = [];
  for (var n = 1; n <= 80; n++) allNums.push(n);

  var results = [];
  for (var set = 0; set < 5; set++) {
    var picks = weightedPick(allNums, scores, 10);
    picks.sort(function(a,b){return a-b;});
    results.push(picks);
  }

  var html = '<div style="padding:0.5rem">';
  html += '<div style="text-align:center;margin-bottom:1rem;font-size:0.9rem;color:var(--muted)">基于大模型评分加权抽选，分数越高的号码被摇中的概率越大</div>';
  for (var s = 0; s < results.length; s++) {
    // 胆码：评分最高的3个
    var scoredNums = results[s].map(function(n){
      var sc = scores.find(function(x){return x.num === n;});
      return {num: n, score: sc ? sc.totalScore : 0};
    }).sort(function(a,b){return b.score - a.score;});
    var danNums = scoredNums.slice(0,3).map(function(x){return x.num;});

    html += '<div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:60px;font-size:0.9rem">第'+(s+1)+'注</span>';
    html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">';
    results[s].forEach(function(n){
      var isDan = danNums.indexOf(n) >= 0;
      html += '<div class="ball '+(isDan?'gold':'red')+'" style="width:30px;height:30px;font-size:0.7rem;'+(isDan?'box-shadow:0 0 8px rgba(245,158,11,0.6);':'')+'">'+pad(n)+'</div>';
    });
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('kl8-lottery-results').innerHTML = html;
  document.getElementById('kl8-lottery-results').style.display = 'block';
}

function spinKL8Review() {
  var numsStr = document.getElementById('kl8-numbers').value;
  var historyStr = document.getElementById('kl8-history').value;
  var lastNums = parseNums(numsStr);
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 10) history.push(nums.slice(0,20).sort(function(a,b){return a-b;}));
  }
  var hasInputLast = lastNums.length >= 10;
  if (history.length === 0 && hasInputLast) {
    history.unshift(lastNums.slice(0,20).sort(function(a,b){return a-b;}));
  }

  // 当期开奖号码（用于命中对比）
  var actualNums;
  if (hasInputLast) {
    actualNums = lastNums.slice(0,20).sort(function(a,b){return a-b;});
  } else if (history.length > 0) {
    actualNums = history[0];
  } else {
    alert('请先输入当期开奖号码或历史数据'); return;
  }

  // 用于生成推荐的历史数据（排除当期开奖号码本身，避免信息泄露）
  var genHistory = hasInputLast ? history : history.slice(1);
  if (genHistory.length < 1) { alert('请至少提供1期历史数据用于生成推荐'); return; }

  var last = genHistory[0];
  var scores = scoreKL8Numbers(last, genHistory);

  var results = [];
  var used = {};
  for (var s = 0; s < 5; s++) {
    var picks = [];
    var zoneCount = [0,0,0,0];
    for (var i = 0; i < scores.length && picks.length < 10; i++) {
      var n = scores[i].num;
      if (used[n]) continue;
      var z = n <= 20 ? 0 : n <= 40 ? 1 : n <= 60 ? 2 : 3;
      if (zoneCount[z] < 4 && Math.random() < 0.75) {
        picks.push(n); used[n] = true; zoneCount[z]++;
      }
    }
    for (var i = 0; i < scores.length && picks.length < 10; i++) {
      var n = scores[i].num;
      if (!used[n] && picks.indexOf(n) < 0) { picks.push(n); used[n] = true; }
    }
    picks.sort(function(a,b){return a-b;});
    results.push(picks);
  }

  // 自动保存机选号码预测记录
  var machineRec = {
    key: new Date().toISOString().slice(0,10) + '_machine',
    date: new Date().toISOString().slice(0,10),
    period: '',
    lastDraw: actualNums.slice().sort(function(a,b){return a-b;}),
    playType: 10,
    playTypeName: '机选选十',
    actualDraw: null,
    verified: false,
    strategies: results.map(function(r, idx){ return {name: '机选第'+(idx+1)+'注', picks: r}; }),
    savedAt: new Date().toISOString()
  };
  var predHistory = JSON.parse(localStorage.getItem(KL8_PREDICTION_STORAGE_KEY) || '[]');
  var existIdx = -1;
  for (var i = 0; i < predHistory.length; i++) {
    if (predHistory[i].key === machineRec.key) { existIdx = i; break; }
  }
  if (existIdx >= 0) predHistory[existIdx] = machineRec;
  else predHistory.unshift(machineRec);
  if (predHistory.length > KL8_MAX_PREDICTIONS) predHistory = predHistory.slice(0, KL8_MAX_PREDICTIONS);
  localStorage.setItem(KL8_PREDICTION_STORAGE_KEY, JSON.stringify(predHistory));

  // ==================== 选五/选十 策略推荐复盘 ====================
  function genStrategy1(pt) {
    var picks = [];
    var used = {};
    var zoneLimits = [Math.ceil(pt/2), Math.ceil(pt/2), Math.ceil(pt/2), Math.ceil(pt/2)];
    var zoneCounts = [0,0,0,0];
    var sortedScores = scores.slice().sort(function(a,b){
      var aScore = a.lastMissScore * 0.4 + a.zoneScore * 0.3 + a.wf * 0.2 + (a.sumRegression||0) * 0.1;
      var bScore = b.lastMissScore * 0.4 + b.zoneScore * 0.3 + b.wf * 0.2 + (b.sumRegression||0) * 0.1;
      if (a.heatDecay < -0.1 && b.heatDecay >= -0.1) return 1;
      if (b.heatDecay < -0.1 && a.heatDecay >= -0.1) return -1;
      return bScore - aScore;
    });
    for (var i=0;i<sortedScores.length && picks.length<pt;i++) {
      var n = sortedScores[i].num;
      var z = n<=20?0:n<=40?1:n<=60?2:3;
      if (zoneCounts[z] < zoneLimits[z]) {
        picks.push(n); used[n] = true; zoneCounts[z]++;
      }
    }
    for (var i=0;i<sortedScores.length && picks.length<pt;i++) {
      if (!used[sortedScores[i].num]) { picks.push(sortedScores[i].num); used[sortedScores[i].num] = true; }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }
  function genStrategy2(pt) {
    var cold = scores.slice().filter(function(s){ return s.heatDecay >= -0.05; }).sort(function(a,b){
      var aCold = a.lastMissScore * 0.7 + a.mp * 0.2 + a.mkScore * 0.1;
      var bCold = b.lastMissScore * 0.7 + b.mp * 0.2 + b.mkScore * 0.1;
      return bCold - aCold;
    }).slice(0, Math.max(pt, 15)).map(function(s){return s.num;});
    var hot = scores.slice(0, 8).filter(function(s){ return s.heatDecay >= -0.05; }).map(function(s){return s.num;});
    var hotCount = Math.ceil(pt * 0.25);
    var picks = cold.slice(0, pt - hotCount).concat(hot.filter(function(n){return cold.indexOf(n)<0;}).slice(0, hotCount));
    var unique = [];
    for (var i=0;i<picks.length && unique.length<pt;i++) if (unique.indexOf(picks[i])<0) unique.push(picks[i]);
    for (var i=0;i<scores.length && unique.length<pt;i++) {
      if (unique.indexOf(scores[i].num)<0 && scores[i].heatDecay >= -0.05) unique.push(scores[i].num);
    }
    unique.sort(function(a,b){return a-b;});
    return unique;
  }
  function genStrategy3(pt) {
    var cycleSorted = scores.slice().sort(function(a,b){
      var ca = cycleAnalysis(a.num, genHistory);
      var cb = cycleAnalysis(b.num, genHistory);
      return cb.score - ca.score || b.mkScore - a.mkScore;
    });
    var picks = cycleSorted.slice(0, pt).map(function(s){return s.num;});
    picks.sort(function(a,b){return a-b;});
    return picks;
  }
  function genStrategy4(pt) {
    var maxRepeat = Math.min(3, Math.floor(pt * 0.25));
    var picks = [];
    var used = {};
    var repeatSorted = scores.slice().filter(function(s){ return last.indexOf(s.num) >= 0; }).sort(function(a,b){return b.totalScore - a.totalScore;});
    for (var i = 0; i < repeatSorted.length && picks.length < maxRepeat; i++) {
      var n = repeatSorted[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }
    var zoneCounts = [0,0,0,0];
    picks.forEach(function(n){ var z=n<=20?0:n<=40?1:n<=60?2:3; zoneCounts[z]++; });
    var hybridSorted = scores.slice().filter(function(s){ return last.indexOf(s.num) < 0; }).sort(function(a,b){
      var aHybrid = a.wf*0.30 + a.mp*0.25 + a.zoneScore*0.20 + a.mkScore*0.15 + (a.stability||0)*0.10;
      var bHybrid = b.wf*0.30 + b.mp*0.25 + b.zoneScore*0.20 + b.mkScore*0.15 + (b.stability||0)*0.10;
      return bHybrid - aHybrid;
    });
    for (var i = 0; i < hybridSorted.length && picks.length < pt; i++) {
      var n = hybridSorted[i].num;
      if (!used[n]) {
        var z = n<=20?0:n<=40?1:n<=60?2:3;
        if (zoneCounts[z] < Math.ceil(pt/2)) { picks.push(n); used[n] = true; zoneCounts[z]++; }
      }
    }
    for (var i = 0; i < scores.length && picks.length < pt; i++) {
      var n = scores[i].num;
      if (!used[n] && last.indexOf(n) < 0) { picks.push(n); used[n] = true; }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function genStrategy5(pt) {
    var picks = [];
    var used = {};
    var hotNums = scores.filter(function(s){ return s.wf > 0.20; }).map(function(s){ return s.num; });
    var warmNums = scores.filter(function(s){ return s.wf > 0.08 && s.wf <= 0.20; }).map(function(s){ return s.num; });
    var coldNums = scores.filter(function(s){ return s.wf <= 0.08 && s.lastMissScore > 0.5; }).map(function(s){ return s.num; });
    var repeatCount = pt >= 10 ? 3 : 2;
    var repeatCandidates = scores.filter(function(s){ return last.indexOf(s.num) >= 0 && s.totalScore > 0.5; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
    for (var i = 0; i < repeatCandidates.length && picks.length < repeatCount; i++) {
      var n = repeatCandidates[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }
    var missCandidates = scores.filter(function(s){ return s.lastMissScore >= 0.55 && s.lastMissScore <= 0.85 && !used[s.num]; }).sort(function(a,b){ return b.lastMissScore - a.lastMissScore; });
    for (var i = 0; i < missCandidates.length && picks.length < pt * 0.25; i++) {
      var n = missCandidates[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }
    var hotTarget = Math.ceil(pt * 0.5);
    var warmTarget = Math.ceil(pt * 0.25);
    for (var i = 0; i < hotNums.length && picks.length < hotTarget; i++) {
      if (!used[hotNums[i]]) { picks.push(hotNums[i]); used[hotNums[i]] = true; }
    }
    for (var i = 0; i < warmNums.length && picks.length < hotTarget + warmTarget; i++) {
      if (!used[warmNums[i]]) { picks.push(warmNums[i]); used[warmNums[i]] = true; }
    }
    for (var i = 0; i < coldNums.length && picks.length < pt; i++) {
      if (!used[coldNums[i]]) { picks.push(coldNums[i]); used[coldNums[i]] = true; }
    }
    var zoneCounts = [0,0,0,0];
    picks.forEach(function(n){ var z=n<=20?0:n<=40?1:n<=60?2:3; zoneCounts[z]++; });
    for (var z = 0; z < 4; z++) {
      if (zoneCounts[z] === 0) {
        var zoneCandidates = scores.filter(function(s){ var sz=s.num<=20?0:s.num<=40?1:s.num<=60?2:3; return sz===z && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (zoneCandidates.length > 0) {
          var n = zoneCandidates[0].num;
          if (picks.length >= pt) {
            var maxZ = zoneCounts.indexOf(Math.max.apply(null, zoneCounts));
            if (maxZ !== z && zoneCounts[maxZ] > 1) {
              for (var ri = 0; ri < picks.length; ri++) {
                var rz = picks[ri]<=20?0:picks[ri]<=40?1:picks[ri]<=60?2:3;
                if (rz === maxZ) { used[picks[ri]] = false; picks[ri] = n; used[n] = true; break; }
              }
            }
          } else {
            picks.push(n); used[n] = true;
          }
          zoneCounts[z]++;
        }
      }
    }
    var oddCount = picks.filter(function(n){ return n%2===1; }).length;
    var evenCount = picks.length - oddCount;
    if (Math.abs(oddCount - evenCount) > 2 && picks.length >= pt * 0.8) {
      if (oddCount > evenCount + 2) {
        var oddPicks = picks.filter(function(n){ return n%2===1; });
        var evenCandidates = scores.filter(function(s){ return s.num%2===0 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (evenCandidates.length > 0 && oddPicks.length > 0) {
          used[oddPicks[0]] = false;
          picks[picks.indexOf(oddPicks[0])] = evenCandidates[0].num;
          used[evenCandidates[0].num] = true;
        }
      } else if (evenCount > oddCount + 2) {
        var evenPicks = picks.filter(function(n){ return n%2===0; });
        var oddCandidates = scores.filter(function(s){ return s.num%2===1 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (oddCandidates.length > 0 && evenPicks.length > 0) {
          used[evenPicks[0]] = false;
          picks[picks.indexOf(evenPicks[0])] = oddCandidates[0].num;
          used[oddCandidates[0].num] = true;
        }
      }
    }
    var smallCount = picks.filter(function(n){ return n <= 40; }).length;
    var bigCount = picks.length - smallCount;
    if (Math.abs(smallCount - bigCount) > 2 && picks.length >= pt * 0.8) {
      if (smallCount > bigCount + 2) {
        var smallPicks = picks.filter(function(n){ return n <= 40; });
        var bigCandidates = scores.filter(function(s){ return s.num > 40 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (bigCandidates.length > 0 && smallPicks.length > 0) {
          used[smallPicks[0]] = false;
          picks[picks.indexOf(smallPicks[0])] = bigCandidates[0].num;
          used[bigCandidates[0].num] = true;
        }
      } else if (bigCount > smallCount + 2) {
        var bigPicks = picks.filter(function(n){ return n > 40; });
        var smallCandidates = scores.filter(function(s){ return s.num <= 40 && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (smallCandidates.length > 0 && bigPicks.length > 0) {
          used[bigPicks[0]] = false;
          picks[picks.indexOf(bigPicks[0])] = smallCandidates[0].num;
          used[smallCandidates[0].num] = true;
        }
      }
    }
    var tailCounts = {};
    picks.forEach(function(n){ var t=n%10; tailCounts[t]=(tailCounts[t]||0)+1; });
    for (var t in tailCounts) {
      if (tailCounts[t] >= 3) {
        var sameTail = picks.filter(function(n){ return n%10===parseInt(t); }).sort(function(a,b){ return (scores.find(function(s){return s.num===a;})||{totalScore:0}).totalScore - (scores.find(function(s){return s.num===b;})||{totalScore:0}).totalScore; });
        var replaceCandidates = scores.filter(function(s){ return s.num%10!==parseInt(t) && !used[s.num]; }).sort(function(a,b){ return b.totalScore - a.totalScore; });
        if (replaceCandidates.length > 0 && sameTail.length > 0) {
          used[sameTail[0]] = false;
          picks[picks.indexOf(sameTail[0])] = replaceCandidates[0].num;
          used[replaceCandidates[0].num] = true;
          tailCounts[t]--; tailCounts[replaceCandidates[0].num%10] = (tailCounts[replaceCandidates[0].num%10]||0)+1;
        }
      }
    }
    for (var i = 0; i < scores.length && picks.length < pt; i++) {
      var n = scores[i].num;
      if (!used[n]) { picks.push(n); used[n] = true; }
    }
    picks.sort(function(a,b){return a-b;});
    return picks;
  }

  function hitCount(picks, actual) {
    return picks.filter(function(n){ return actual.indexOf(n) >= 0; }).length;
  }

  // 生成选五和选十的推荐并计算命中
  var playTypes = [5, 10];
  var playTypeNames = {5:'选五', 10:'选十'};
  var strategyNames = ['区间均衡+热号', '冷号优先+遗漏', '重号优选', '专家技巧综合'];

  // 将策略推荐也保存到Tab7
  var allPlayTypeRecs = {};
  for (var pi = 0; pi < playTypes.length; pi++) {
    var pt = playTypes[pi];
    allPlayTypeRecs[pt] = [
      {name: '区间均衡+热号', picks: genStrategy1(pt)},
      {name: '冷号优先+遗漏', picks: genStrategy2(pt)},
      {name: '重号优选', picks: genStrategy4(pt)},
      {name: '专家技巧综合', picks: genStrategy5(pt)}
    ];
  }
  if (typeof saveKL8AllPredictions === 'function') {
    try { saveKL8AllPredictions(actualNums, allPlayTypeRecs); } catch(e) {}
  }

  var html = '<div style="padding:0.5rem">';
  html += '<div style="margin-bottom:1rem;padding:0.6rem;background:var(--bg3);border-radius:8px;border:1px solid var(--accent);font-size:0.8rem;color:var(--muted)">';
  html += '<strong style="color:var(--accent)">&#128161; 说明：</strong>以下号码为<strong>预测今日开奖</strong>的推荐号码。开奖后请在<strong>Tab7 往期预测记录</strong>中查看命中验证结果。';
  html += '</div>';

  // 机选号码预测
  html += '<div style="margin-bottom:1rem;font-weight:700;color:var(--ink);font-size:0.95rem">&#127922; 机选号码预测（待开奖）</div>';
  for (var s = 0; s < results.length; s++) {
    html += '<div style="padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
    html += '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">';
    html += '<span style="font-weight:700;color:var(--accent);min-width:50px;font-size:0.9rem">第'+(s+1)+'注</span>';
    results[s].forEach(function(n){
      html += '<div class="ball red" style="width:30px;height:30px;font-size:0.7rem">'+pad(n)+'</div>';
    });
    html += '<span style="margin-left:auto;background:var(--accent);color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600">待开奖</span>';
    html += '</div>';
    html += '</div>';
  }

  // 策略推荐预测
  for (var pi = 0; pi < playTypes.length; pi++) {
    var pt = playTypes[pi];
    var strategies = allPlayTypeRecs[pt];

    html += '<div style="margin-top:1.5rem;margin-bottom:0.5rem;font-weight:700;color:var(--ink);font-size:0.95rem">&#127919; ' + playTypeNames[pt] + '玩法策略推荐（待开奖）</div>';
    for (var si = 0; si < strategies.length; si++) {
      var picks = strategies[si].picks;
      html += '<div style="padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
      html += '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">';
      html += '<span style="font-weight:700;color:var(--accent);min-width:80px;font-size:0.85rem">策略'+(si+1)+'</span>';
      html += '<span style="font-size:0.75rem;color:var(--muted)">'+strategyNames[si]+'</span>';
      html += '<span style="margin-left:auto;background:var(--accent);color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600">待开奖</span>';
      html += '</div>';
      html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-top:0.4rem">';
      picks.forEach(function(n){
        html += '<div class="ball red" style="width:28px;height:28px;font-size:0.65rem;">'+pad(n)+'</div>';
      });
      html += '</div>';
      html += '</div>';
    }
  }

  html += '</div>';

  document.getElementById('kl8-review-analysis').innerHTML = html;
}

// ==================== KL8往期预测记录模块 ====================

var KL8_PREDICTION_STORAGE_KEY = 'kl8_prediction_history';
var KL8_MAX_PREDICTIONS = 50;

// 保存预测记录
function saveKL8Prediction(lastDraw, playType, strategies) {
  var history = JSON.parse(localStorage.getItem(KL8_PREDICTION_STORAGE_KEY) || '[]');
  // 基于当天日期+playType生成唯一key，同一天同玩法只保存最新一次
  var today = new Date().toISOString().slice(0,10);
  var key = today + '_' + playType;
  var rec = {
    key: key,
    date: today,
    period: '', // 如果有期号会填充
    lastDraw: lastDraw.slice().sort(function(a,b){return a-b;}),
    playType: playType,
    playTypeName: '选' + playType,
    actualDraw: null, // 开奖后填充
    verified: false,
    strategies: strategies, // [{name, picks}]
    savedAt: new Date().toISOString()
  };
  // 去重：同日期同玩法覆盖
  var idx = -1;
  for (var i = 0; i < history.length; i++) {
    if (history[i].key === key) { idx = i; break; }
  }
  if (idx >= 0) {
    history[idx] = rec;
  } else {
    history.unshift(rec);
  }
  // 限制最多50条
  if (history.length > KL8_MAX_PREDICTIONS) history = history.slice(0, KL8_MAX_PREDICTIONS);
  localStorage.setItem(KL8_PREDICTION_STORAGE_KEY, JSON.stringify(history));
}

// 批量保存选五+选十推荐
function saveKL8AllPredictions(lastDraw, allRecs) {
  for (var pt = 5; pt <= 10; pt++) {
    if (allRecs[pt]) {
      var strategies = allRecs[pt].map(function(s){ return {name: s.name, picks: s.picks}; });
      saveKL8Prediction(lastDraw, pt, strategies);
    }
  }
}

// 根据实际开奖号码验证预测
function verifyKL8Predictions(actualDraw) {
  var history = JSON.parse(localStorage.getItem(KL8_PREDICTION_STORAGE_KEY) || '[]');
  var sortedActual = actualDraw.slice().sort(function(a,b){return a-b;});
  var updated = false;
  for (var i = 0; i < history.length; i++) {
    var rec = history[i];
    // 验证条件：未验证，且开奖号码与预测基准不同（避免用当期验证当期）
    if (!rec.verified) {
      var lastDrawStr = rec.lastDraw.slice().sort(function(a,b){return a-b;}).join(',');
      var actualStr = sortedActual.join(',');
      if (lastDrawStr !== actualStr) {
        rec.actualDraw = sortedActual;
        rec.verified = true;
        // 计算每个策略的命中数
        for (var j = 0; j < rec.strategies.length; j++) {
          var picks = rec.strategies[j].picks;
          rec.strategies[j].hits = picks.filter(function(n){ return actualDraw.indexOf(n) >= 0; }).length;
          rec.strategies[j].hitNums = picks.filter(function(n){ return actualDraw.indexOf(n) >= 0; });
        }
        updated = true;
      }
    }
  }
  if (updated) {
    localStorage.setItem(KL8_PREDICTION_STORAGE_KEY, JSON.stringify(history));
    // 验证完成后触发自主学习
    try { learnFromHistory(); } catch(e) { console.log('learnFromHistory error:', e.message); }
  }
  return updated;
}

// ==================== 模型自主学习引擎 ====================

var KL8_LEARNING_KEY = 'kl8_learning_log';

// 根据历史命中率自动调整评分权重
function learnFromHistory() {
  var predictions = JSON.parse(localStorage.getItem(KL8_PREDICTION_STORAGE_KEY) || '[]');
  var verified = predictions.filter(function(r){ return r.verified; });
  if (verified.length < 3) return null; // 数据不足，不调整

  // 只取最近20期进行学习
  var recent = verified.slice(0, Math.min(20, verified.length));

  // 计算各策略的命中率
  var strategyStats = {};
  for (var i = 0; i < recent.length; i++) {
    var rec = recent[i];
    for (var j = 0; j < rec.strategies.length; j++) {
      var st = rec.strategies[j];
      var name = st.name;
      if (!strategyStats[name]) {
        strategyStats[name] = { hits: 0, total: 0, count: 0, rates: [] };
      }
      strategyStats[name].hits += (st.hits || 0);
      strategyStats[name].total += rec.playType;
      strategyStats[name].count++;
      strategyStats[name].rates.push((st.hits || 0) / rec.playType);
    }
  }

  // 计算平均命中率
  var strategyRates = {};
  var names = Object.keys(strategyStats);
  for (var i = 0; i < names.length; i++) {
    var s = strategyStats[names[i]];
    strategyRates[names[i]] = s.hits / s.total;
  }

  // 获取当前权重
  var weights = getKL8AdaptiveWeights();

  // 策略与评分维度的映射
  var strategyToWeights = {
    '区间均衡+热号': ['zoneScore', 'wf'],
    '冷号优先+遗漏': ['lastMissScore', 'mpScore'],
    '重号优选': ['neighborScore']
  };

  var adjustments = [];
  var adjustAmount = 0.008; // 每次微调幅度
  var minWeight = 0.02, maxWeight = 0.25;

  // 找出最高和最低命中率的策略
  var sortedNames = names.slice().sort(function(a,b){ return strategyRates[b] - strategyRates[a]; });
  if (sortedNames.length >= 2) {
    var best = sortedNames[0];
    var worst = sortedNames[sortedNames.length - 1];
    var bestRate = strategyRates[best];
    var worstRate = strategyRates[worst];

    // 只有当差距足够大时才调整
    if (bestRate - worstRate > 0.03) {
      var bestWeights = strategyToWeights[best];
      var worstWeights = strategyToWeights[worst];

      if (bestWeights) {
        for (var i = 0; i < bestWeights.length; i++) {
          var wk = bestWeights[i];
          if (weights[wk] + adjustAmount <= maxWeight) {
            weights[wk] += adjustAmount;
            adjustments.push(wk + ' +' + (adjustAmount*100).toFixed(1) + '%');
          }
        }
      }
      if (worstWeights) {
        for (var i = 0; i < worstWeights.length; i++) {
          var wk = worstWeights[i];
          if (weights[wk] - adjustAmount >= minWeight) {
            weights[wk] -= adjustAmount;
            adjustments.push(wk + ' -' + (adjustAmount*100).toFixed(1) + '%');
          }
        }
      }
    }
  }

  // 保存调整后的权重
  if (adjustments.length > 0) {
    localStorage.setItem('kl8_adaptive_weights_v2', JSON.stringify(weights));

    // 记录学习日志
    var log = JSON.parse(localStorage.getItem(KL8_LEARNING_KEY) || '[]');
    log.unshift({
      date: new Date().toISOString().slice(0,10),
      time: new Date().toISOString(),
      sampleSize: recent.length,
      strategyRates: strategyRates,
      adjustments: adjustments,
      newWeights: weights
    });
    if (log.length > 30) log = log.slice(0, 30);
    localStorage.setItem(KL8_LEARNING_KEY, JSON.stringify(log));
  }

  return { strategyRates: strategyRates, adjustments: adjustments, weights: weights };
}

// 渲染学习报告
function renderKL8LearningReport() {
  var log = JSON.parse(localStorage.getItem(KL8_LEARNING_KEY) || '[]');
  var weights = getKL8AdaptiveWeights();

  var html = '<div style="padding:0.8rem;background:var(--bg2);border-radius:8px;border:1px solid var(--rule);margin-bottom:1rem;font-size:0.8rem">';
  html += '<div style="font-weight:700;color:var(--ink);margin-bottom:0.5rem">🧠 模型自主学习报告</div>';

  // 当前权重
  html += '<div style="color:var(--muted);margin-bottom:0.3rem">当前评分权重（根据历史命中率自动优化）：</div>';
  var weightNames = {
    wf: '热号频率', mpScore: '遗漏百分位', mkScore: '周期驱动',
    zoneScore: '区间均衡', neighborScore: '重号邻号', oddEvenScore: '奇偶均衡',
    bigSmallScore: '大小均衡', lastMissScore: '遗漏回补', tailScore: '尾数分散',
    stability: '稳定性', consecutiveScore: '连号历史', maScore: '移动平均',
    cycleScore: '周期性', heatDecay: '热号衰减', sumRegression: '和值回归'
  };
  var wKeys = Object.keys(weights).filter(function(k){ return weightNames[k]; });
  for (var i = 0; i < wKeys.length; i++) {
    var k = wKeys[i];
    var pct = Math.round(weights[k] * 100);
    html += '<div style="display:flex;align-items:center;gap:0.5rem;margin:0.15rem 0">';
    html += '<span style="min-width:90px;font-size:0.72rem">' + weightNames[k] + '</span>';
    html += '<div style="flex:1;height:8px;background:var(--bg3);border-radius:4px;overflow:hidden">';
    html += '<div style="height:100%;width:'+pct+'%;background:var(--accent);border-radius:4px"></div></div>';
    html += '<span style="font-size:0.72rem;width:35px;text-align:right">'+pct+'%</span>';
    html += '</div>';
  }

  // 最近调整记录
  if (log.length > 0) {
    html += '<div style="margin-top:0.5rem;border-top:1px solid var(--rule);padding-top:0.5rem">';
    html += '<div style="color:var(--muted);margin-bottom:0.3rem">最近权重调整记录：</div>';
    for (var i = 0; i < Math.min(5, log.length); i++) {
      var entry = log[i];
      html += '<div style="font-size:0.72rem;color:var(--ink);margin:0.1rem 0">';
      html += entry.date + '：' + entry.adjustments.join('，');
      html += '</div>';
    }
    html += '</div>';
  } else {
    html += '<div style="margin-top:0.5rem;color:var(--muted);font-size:0.75rem">暂无调整记录，需要至少3期验证数据后自动开始学习。</div>';
  }

  html += '</div>';
  return html;
}

// 清除预测历史
function clearKL8PredictionHistory() {
  if (!confirm('确定要清除所有往期预测记录吗？')) return;
  localStorage.removeItem(KL8_PREDICTION_STORAGE_KEY);
  localStorage.removeItem(KL8_LEARNING_KEY);
  localStorage.removeItem('kl8_adaptive_weights_v2');
  document.getElementById('kl8-prediction-history').innerHTML = '<div style="text-align:center;color:var(--muted);padding:2rem">已清除全部记录</div>';
  var statsEl = document.getElementById('kl8-prediction-stats');
  if (statsEl) statsEl.innerHTML = '';
  var dateFilterEl = document.getElementById('kl8-history-date-filter');
  if (dateFilterEl) { dateFilterEl.innerHTML = '<option value="all">全部日期</option>'; }
}

function filterKL8HistoryByDate() {
  renderKL8PredictionHistory();
}

// 渲染预测历史
function renderKL8PredictionHistory() {
  var history = JSON.parse(localStorage.getItem(KL8_PREDICTION_STORAGE_KEY) || '[]');
  var container = document.getElementById('kl8-prediction-history');

  if (history.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:2rem">暂无预测记录，请先在"选五/选十推荐"中生成推荐号码</div>';
    var statsEl = document.getElementById('kl8-prediction-stats');
    if (statsEl) statsEl.innerHTML = '';
    return;
  }

  // 填充日期筛选器
  var dateFilterEl = document.getElementById('kl8-history-date-filter');
  if (dateFilterEl) {
    var allDates = [];
    for (var i = 0; i < history.length; i++) {
      var d = history[i].date;
      if (allDates.indexOf(d) < 0) allDates.push(d);
    }
    allDates.sort().reverse();
    // 保存当前选中值
    var currentVal = dateFilterEl.value;
    dateFilterEl.innerHTML = '<option value="all">全部日期（'+history.length+'条记录）</option>';
    for (var i = 0; i < allDates.length; i++) {
      var dayRecs = history.filter(function(r){return r.date===allDates[i];});
      var verifiedCount = dayRecs.filter(function(r){return r.verified;}).length;
      dateFilterEl.innerHTML += '<option value="'+allDates[i]+'">'+allDates[i]+' ('+dayRecs.length+'条'+(verifiedCount>0?'，'+verifiedCount+'条已验证':'')+')</option>';
    }
    dateFilterEl.value = currentVal;
  }

  var html = '';

  // 显示今日待开奖推荐
  var todayStr = new Date().toISOString().slice(0,10);
  var todayRecs = history.filter(function(r){ return r.date === todayStr && !r.verified; });
  if (todayRecs.length > 0) {
    html += '<div style="padding:0.8rem;background:var(--bg3);border-radius:8px;border:2px solid var(--accent);margin-bottom:1rem">';
    html += '<div style="font-weight:700;color:var(--accent);margin-bottom:0.5rem;font-size:0.9rem">&#127775; 今日推荐（待开奖）</div>';
    html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.5rem">以下推荐基于今日历史数据生成，晚上开奖后将自动验证命中情况</div>';
    for (var tri = 0; tri < todayRecs.length; tri++) {
      var trec = todayRecs[tri];
      html += '<div style="padding:0.5rem;background:var(--bg2);border-radius:6px;margin-bottom:0.4rem">';
      html += '<div style="font-weight:600;color:var(--ink);font-size:0.8rem">'+trec.playTypeName+'</div>';
      for (var tsi = 0; tsi < trec.strategies.length; tsi++) {
        var tst = trec.strategies[tsi];
        html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-top:0.2rem">';
        html += '<span style="font-size:0.7rem;color:var(--muted);min-width:70px">'+tst.name+'</span>';
        for (var tni = 0; tni < tst.picks.length; tni++) {
          html += '<span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;font-size:0.6rem;background:var(--accent4);color:#fff;">'+pad(tst.picks[tni])+'</span>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }

  // 显示自主学习报告
  try {
    var learningHtml = renderKL8LearningReport();
    if (learningHtml) html += learningHtml;
  } catch(e) { console.log('renderKL8LearningReport error:', e.message); }

  // 命中率统计面板
  var statsHtml = '<div style="padding:0.8rem;background:var(--bg2);border-radius:8px;border:1px solid var(--rule);margin-bottom:1rem;font-size:0.8rem">';
  var verifiedRecs = history.filter(function(r){return r.verified;});
  var pendingRecs = history.filter(function(r){return !r.verified;});
  statsHtml += '<div style="display:flex;gap:1.5rem;flex-wrap:wrap">';
  statsHtml += '<div><span style="color:var(--muted)">总记录：</span><strong>'+history.length+'条</strong></div>';
  statsHtml += '<div><span style="color:var(--muted)">已验证：</span><strong style="color:var(--accent3)">'+verifiedRecs.length+'条</strong></div>';
  statsHtml += '<div><span style="color:var(--muted)">待开奖：</span><strong style="color:var(--accent)">'+pendingRecs.length+'条</strong></div>';
  // 各策略累计命中率
  if (verifiedRecs.length > 0) {
    var strategyHitMap = {};
    var strategyTotalMap = {};
    for (var i = 0; i < verifiedRecs.length; i++) {
      for (var j = 0; j < verifiedRecs[i].strategies.length; j++) {
        var sn = verifiedRecs[i].strategies[j].name;
        if (!strategyHitMap[sn]) { strategyHitMap[sn] = 0; strategyTotalMap[sn] = 0; }
        strategyHitMap[sn] += (verifiedRecs[i].strategies[j].hits || 0);
        strategyTotalMap[sn] += verifiedRecs[i].playType;
      }
    }
    statsHtml += '</div><div style="margin-top:0.5rem;border-top:1px solid var(--rule);padding-top:0.5rem">';
    statsHtml += '<div style="color:var(--muted);margin-bottom:0.3rem">各策略累计命中率：</div>';
    var sNames = Object.keys(strategyHitMap);
    for (var i = 0; i < sNames.length; i++) {
      var rate = Math.round(strategyHitMap[sNames[i]] / strategyTotalMap[sNames[i]] * 100);
      var barColor = rate>=40?'var(--accent3)':(rate>=20?'var(--accent)':'var(--accent4)');
      statsHtml += '<div style="display:flex;align-items:center;gap:0.5rem;margin:0.2rem 0">';
      statsHtml += '<span style="min-width:100px;font-size:0.75rem">'+sNames[i]+'</span>';
      statsHtml += '<div style="flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+rate+'%;background:'+barColor+';border-radius:3px"></div></div>';
      statsHtml += '<span style="font-size:0.75rem;font-weight:600;color:'+barColor+'">'+rate+'%</span>';
      statsHtml += '</div>';
    }
  }
  statsHtml += '</div></div>';
  var statsEl = document.getElementById('kl8-prediction-stats');
  if (statsEl) statsEl.innerHTML = statsHtml;
  // 按日期分组
  var grouped = {};
  for (var i = 0; i < history.length; i++) {
    var d = history[i].date;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(history[i]);
  }
  var dates = Object.keys(grouped).sort().reverse();

  // 按日期筛选
  var filterDate = document.getElementById('kl8-history-date-filter');
  var filterVal = filterDate ? filterDate.value : 'all';
  if (filterVal !== 'all') {
    grouped = {};
    grouped[filterVal] = [];
    for (var i = 0; i < history.length; i++) {
      if (history[i].date === filterVal) grouped[filterVal].push(history[i]);
    }
    dates = [filterVal];
  }

  for (var di = 0; di < dates.length; di++) {
    var date = dates[di];
    var recs = grouped[date];
    html += '<div style="margin-bottom:1.5rem">';
    html += '<div style="font-weight:700;color:var(--ink);font-size:0.95rem;margin-bottom:0.5rem;padding-bottom:0.3rem;border-bottom:1px solid var(--rule)">'+date+' 预测推荐</div>';

    for (var ri = 0; ri < recs.length; ri++) {
      var rec = recs[ri];
      var hasVerified = rec.verified && rec.actualDraw;
      html += '<div style="padding:0.8rem 1rem;margin-bottom:0.5rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';

      // 标题行
      html += '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">';
      html += '<span style="font-weight:700;color:var(--accent);font-size:0.85rem">'+rec.playTypeName+'</span>';
      if (hasVerified) {
        html += '<span style="background:var(--accent3);color:#000;padding:1px 6px;border-radius:4px;font-size:0.7rem;font-weight:600">已验证</span>';
      } else {
        html += '<span style="background:var(--muted);color:#fff;padding:1px 6px;border-radius:4px;font-size:0.7rem">待开奖</span>';
      }
      html += '</div>';

      // 参考的开奖号码（预测时用的当期数据）
      html += '<div style="margin-top:0.3rem;font-size:0.7rem;color:var(--muted)">参考数据（预测基准）：';
      html += rec.lastDraw.map(function(n){return pad(n);}).join(', ');
      html += '</div>';

      // 如果已验证，显示开奖号码
      if (hasVerified) {
        html += '<div style="margin-top:0.2rem;font-size:0.7rem;color:var(--accent3);font-weight:600">开奖号码：';
        html += rec.actualDraw.map(function(n){return pad(n);}).join(', ');
        html += '</div>';
      }

      // 各策略推荐及命中
      for (var si = 0; si < rec.strategies.length; si++) {
        var st = rec.strategies[si];
        var hits = st.hits || 0;
        var hitNums = st.hitNums || [];
        var pt = rec.playType;
        html += '<div style="margin-top:0.4rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">';
        html += '<span style="font-size:0.75rem;color:var(--muted);min-width:60px">'+st.name+'</span>';
        html += '<div style="display:flex;gap:3px;flex-wrap:wrap">';
        for (var ni = 0; ni < st.picks.length; ni++) {
          var n = st.picks[ni];
          var isHit = hitNums.indexOf(n) >= 0;
          if (hasVerified) {
            html += '<span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;font-size:0.65rem;'+(isHit?'background:var(--accent3);color:#000;font-weight:700;box-shadow:0 0 0 2px var(--accent3);':'background:var(--accent4);color:#fff;')+'">'+pad(n)+'</span>';
          } else {
            html += '<span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;font-size:0.65rem;background:var(--accent4);color:#fff;">'+pad(n)+'</span>';
          }
        }
        html += '</div>';
        if (hasVerified) {
          var hitPct = Math.round(hits / pt * 100);
          html += '<span style="margin-left:auto;background:'+(hitPct>=40?'var(--accent3)':(hitPct>=20?'var(--accent)':'var(--accent4)'))+';color:#000;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:600">'+hits+'/'+pt+'</span>';
        }
        html += '</div>';
        if (hasVerified && hitNums.length > 0) {
          html += '<div style="margin-top:0.1rem;font-size:0.65rem;color:var(--accent3)">命中：'+hitNums.map(function(n){return pad(n);}).join(', ')+'</div>';
        }
      }

      html += '</div>';
    }
    html += '</div>';
  }

  document.getElementById('kl8-prediction-history').innerHTML = html;
}

// ==================== 往期回溯验证模块 ====================

// DLT多期回溯验证
function runDLTBacktest() {
  var historyStr = document.getElementById('dlt-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var f = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (f.length >= 5 && b.length >= 2) {
      history.push({ front: f.slice(0,5).sort(function(a,b){return a-b}), back: b.slice(0,2).sort(function(a,b){return a-b}) });
    }
  }
  if (history.length < 15) { alert('请至少输入15期历史数据进行回溯验证'); return; }

  var periods = Math.min(10, history.length - 5);
  var results = [];
  var dimensionHits = { wf:0, mpScore:0, mkScore:0, zoneScore:0, neighborScore:0, diagonalScore:0, pairScore:0, hotColdAltScore:0, crossLotteryScore:0, coScore:0 };
  var dimensionTotal = { wf:0, mpScore:0, mkScore:0, zoneScore:0, neighborScore:0, diagonalScore:0, pairScore:0, hotColdAltScore:0, crossLotteryScore:0, coScore:0 };

  for (var p = 0; p < periods; p++) {
    var actual = history[p];
    var simHistory = history.slice(p+1, p+6);
    var lastDraw = simHistory[0].front.concat(simHistory[0].back);
    var hist = simHistory.slice(1).map(function(h){ return h.front.concat(h.back); });
    var scores = scoreDLTNumbers_V3(lastDraw, hist);
    var backScores = scoreDLTBlueNumbers_V3(lastDraw, hist);

    var topFronts = scores.slice(0,10).map(function(s){return s.num;});
    var topBacks = backScores.slice(0,3).map(function(s){return s.num;});

    var frontHits = topFronts.filter(function(n){ return actual.front.indexOf(n) >= 0; });
    var backHits = topBacks.filter(function(n){ return actual.back.indexOf(n) >= 0; });

    results.push({
      period: p + 1,
      actualFront: actual.front,
      actualBack: actual.back,
      predictedFront: topFronts,
      predictedBack: topBacks,
      frontHits: frontHits,
      backHits: backHits,
      frontHitCount: frontHits.length,
      backHitCount: backHits.length
    });

    // 统计命中号码的维度特征
    frontHits.forEach(function(n){
      for (var i = 0; i < scores.length; i++) {
        if (scores[i].num === n) {
          for (var dim in dimensionHits) {
            if (scores[i][dim] !== undefined) {
              dimensionHits[dim] += scores[i][dim];
              dimensionTotal[dim]++;
            }
          }
          break;
        }
      }
    });
  }

  // 计算各维度平均命中得分
  var dimAnalysis = {};
  for (var dim in dimensionHits) {
    dimAnalysis[dim] = dimensionTotal[dim] > 0 ? dimensionHits[dim] / dimensionTotal[dim] : 0;
  }

  // 生成HTML报告
  var html = '<div style="padding:0.5rem">';

  // 汇总统计
  var totalFrontHits = results.reduce(function(s,r){return s+r.frontHitCount;},0);
  var totalBackHits = results.reduce(function(s,r){return s+r.backHitCount;},0);
  var avgFrontHit = (totalFrontHits / periods).toFixed(2);
  var avgBackHit = (totalBackHits / periods).toFixed(2);

  html += '<div style="margin-bottom:1rem;padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">回溯验证汇总（最近'+periods+'期）</div>';
  html += '<div style="display:flex;gap:1rem;flex-wrap:wrap">';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent);color:#000;border-radius:6px;font-weight:bold">前区平均命中: '+avgFrontHit+'/5</div>';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent2);color:#fff;border-radius:6px;font-weight:bold">后区平均命中: '+avgBackHit+'/2</div>';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent3);color:#000;border-radius:6px;font-weight:bold">总命中率: '+((totalFrontHits+totalBackHits)/periods/7*100).toFixed(1)+'%</div>';
  html += '</div></div>';

  // 维度分析
  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">命中号码维度特征分析</div>';
  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  html += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule)">维度</th><th style="padding:6px;border:1px solid var(--rule)">命中平均得分</th><th style="padding:6px;border:1px solid var(--rule)">有效性</th></tr></thead><tbody>';
  var dimNames = { wf:'频率', mpScore:'遗漏回补', mkScore:'周期驱动', zoneScore:'区间', neighborScore:'邻号', diagonalScore:'斜连', pairScore:'连号', hotColdAltScore:'冷热交替', crossLotteryScore:'跨彩种', coScore:'共现' };
  var sortedDims = Object.keys(dimAnalysis).sort(function(a,b){return dimAnalysis[b]-dimAnalysis[a];});
  sortedDims.forEach(function(dim){
    var val = dimAnalysis[dim];
    var effective = val > 0.6 ? '高' : val > 0.4 ? '中' : '低';
    var color = val > 0.6 ? 'var(--accent3)' : val > 0.4 ? 'var(--accent)' : 'var(--muted)';
    html += '<tr><td style="padding:6px;border:1px solid var(--rule)">'+(dimNames[dim]||dim)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center">'+(val*100).toFixed(1)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:'+color+';font-weight:bold">'+effective+'</td></tr>';
  });
  html += '</tbody></table></div></div>';

  // 每期详情
  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">每期回测详情</div>';
  results.forEach(function(r){
    html += '<div style="margin-bottom:0.5rem;padding:0.6rem;background:var(--bg3);border-radius:6px;border:1px solid var(--rule);font-size:0.8rem">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span>第'+r.period+'期</span>';
    html += '<span style="color:var(--accent);font-weight:bold">前区命中'+r.frontHitCount+' 后区命中'+r.backHitCount+'</span>';
    html += '</div>';
    html += '<div style="margin-top:0.3rem;color:var(--muted)">实际: '+r.actualFront.map(function(n){return pad(n);}).join(',')+' | '+r.actualBack.map(function(n){return pad(n);}).join(',')+'</div>';
    html += '<div style="color:var(--muted)">预测: '+r.predictedFront.map(function(n){return pad(n);}).join(',')+' | '+r.predictedBack.map(function(n){return pad(n);}).join(',')+'</div>';
    html += '</div>';
  });
  html += '</div>';

  // 优化建议
  html += '<div style="padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">下期推荐优化建议</div>';
  var topDims = sortedDims.slice(0,3);
  html += '<div style="font-size:0.8rem;color:var(--muted)">根据回溯验证，以下维度命中率最高，下期推荐将自动提升这些维度的权重：</div>';
  html += '<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap">';
  topDims.forEach(function(dim){
    html += '<span style="padding:0.3rem 0.6rem;background:var(--accent);color:#000;border-radius:4px;font-size:0.75rem;font-weight:bold">'+(dimNames[dim]||dim)+'</span>';
  });
  html += '</div></div>';

  html += '</div>';

  document.getElementById('dlt-backtest-results').innerHTML = html;

  // 保存优化后的权重到localStorage
  var w = getDLTAdaptiveWeights();
  var adjusted = {};
  for (var k in w) adjusted[k] = w[k];
  sortedDims.forEach(function(dim, idx){
    if (idx < 3) {
      adjusted[dim] = Math.min(adjusted[dim] * 1.15, adjusted[dim] + 0.03);
    } else if (dimAnalysis[dim] < 0.3) {
      adjusted[dim] = Math.max(adjusted[dim] * 0.9, adjusted[dim] - 0.02);
    }
  });
  var sumExCo = 0;
  for (var k in adjusted) { if (k !== 'coScore') sumExCo += adjusted[k]; }
  if (sumExCo > 0) {
    var target = 1.0 - adjusted.coScore;
    for (var k in adjusted) { if (k !== 'coScore') adjusted[k] = adjusted[k] / sumExCo * target; }
  }
  try {
    localStorage.setItem('dlt_adaptive_weights', JSON.stringify(adjusted));
    console.log('DLT回溯验证权重已优化:', adjusted);
  } catch(e) {}
}

// SSQ多期回溯验证
function runSSQBacktest() {
  var historyStr = document.getElementById('ssq-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    var r = parseNums(parts[0]);
    var b = parseNums(parts[1] || '');
    if (r.length >= 6 && b.length >= 1) {
      history.push({ red: r.slice(0,6).sort(function(a,b){return a-b}), blue: b[0] });
    }
  }
  if (history.length < 15) { alert('请至少输入15期历史数据进行回溯验证'); return; }

  var periods = Math.min(10, history.length - 5);
  var results = [];
  var dimensionHits = { wf:0, mpScore:0, mkScore:0, zoneScore:0, neighborScore:0, pairScore:0, hcScore:0, coScore:0 };
  var dimensionTotal = { wf:0, mpScore:0, mkScore:0, zoneScore:0, neighborScore:0, pairScore:0, hcScore:0, coScore:0 };

  for (var p = 0; p < periods; p++) {
    var actual = history[p];
    var simHistory = history.slice(p+1, p+6);
    var lastDraw = simHistory[0].red.concat([simHistory[0].blue]);
    var simReds = simHistory.slice(1).map(function(h){ return h.red; });
    var scores = scoreSSQNumbers(lastDraw, simReds);

    var topReds = scores.slice(0,10).map(function(s){return s.num;});
    var redHits = topReds.filter(function(n){ return actual.red.indexOf(n) >= 0; });

    results.push({
      period: p + 1,
      actualRed: actual.red,
      actualBlue: actual.blue,
      predictedRed: topReds,
      redHits: redHits,
      redHitCount: redHits.length
    });

    redHits.forEach(function(n){
      for (var i = 0; i < scores.length; i++) {
        if (scores[i].num === n) {
          for (var dim in dimensionHits) {
            if (scores[i][dim] !== undefined) {
              dimensionHits[dim] += scores[i][dim];
              dimensionTotal[dim]++;
            }
          }
          break;
        }
      }
    });
  }

  var dimAnalysis = {};
  for (var dim in dimensionHits) {
    dimAnalysis[dim] = dimensionTotal[dim] > 0 ? dimensionHits[dim] / dimensionTotal[dim] : 0;
  }

  var html = '<div style="padding:0.5rem">';
  var totalRedHits = results.reduce(function(s,r){return s+r.redHitCount;},0);
  var avgRedHit = (totalRedHits / periods).toFixed(2);

  html += '<div style="margin-bottom:1rem;padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">回溯验证汇总（最近'+periods+'期）</div>';
  html += '<div style="display:flex;gap:1rem;flex-wrap:wrap">';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent);color:#000;border-radius:6px;font-weight:bold">红球平均命中: '+avgRedHit+'/6</div>';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent3);color:#000;border-radius:6px;font-weight:bold">命中率: '+(totalRedHits/periods/6*100).toFixed(1)+'%</div>';
  html += '</div></div>';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">命中号码维度特征分析</div>';
  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  html += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule)">维度</th><th style="padding:6px;border:1px solid var(--rule)">命中平均得分</th><th style="padding:6px;border:1px solid var(--rule)">有效性</th></tr></thead><tbody>';
  var dimNames = { wf:'频率', mpScore:'遗漏回补', mkScore:'周期驱动', zoneScore:'区间', neighborScore:'邻号', pairScore:'连号', hcScore:'冷热', coScore:'共现' };
  var sortedDims = Object.keys(dimAnalysis).sort(function(a,b){return dimAnalysis[b]-dimAnalysis[a];});
  sortedDims.forEach(function(dim){
    var val = dimAnalysis[dim];
    var effective = val > 0.6 ? '高' : val > 0.4 ? '中' : '低';
    var color = val > 0.6 ? 'var(--accent3)' : val > 0.4 ? 'var(--accent)' : 'var(--muted)';
    html += '<tr><td style="padding:6px;border:1px solid var(--rule)">'+(dimNames[dim]||dim)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center">'+(val*100).toFixed(1)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:'+color+';font-weight:bold">'+effective+'</td></tr>';
  });
  html += '</tbody></table></div></div>';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">每期回测详情</div>';
  results.forEach(function(r){
    html += '<div style="margin-bottom:0.5rem;padding:0.6rem;background:var(--bg3);border-radius:6px;border:1px solid var(--rule);font-size:0.8rem">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span>第'+r.period+'期</span>';
    html += '<span style="color:var(--accent);font-weight:bold">红球命中'+r.redHitCount+'</span>';
    html += '</div>';
    html += '<div style="margin-top:0.3rem;color:var(--muted)">实际: '+r.actualRed.map(function(n){return pad(n);}).join(',')+' + '+pad(r.actualBlue)+'</div>';
    html += '<div style="color:var(--muted)">预测: '+r.predictedRed.map(function(n){return pad(n);}).join(',')+'</div>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div style="padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">下期推荐优化建议</div>';
  var topDims = sortedDims.slice(0,3);
  html += '<div style="font-size:0.8rem;color:var(--muted)">根据回溯验证，以下维度命中率最高，下期推荐将自动提升这些维度的权重：</div>';
  html += '<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap">';
  topDims.forEach(function(dim){
    html += '<span style="padding:0.3rem 0.6rem;background:var(--accent);color:#000;border-radius:4px;font-size:0.75rem;font-weight:bold">'+(dimNames[dim]||dim)+'</span>';
  });
  html += '</div></div>';

  html += '</div>';
  document.getElementById('ssq-backtest-results').innerHTML = html;

  var w = getSSQAdaptiveWeights();
  var adjusted = {};
  for (var k in w) adjusted[k] = w[k];
  sortedDims.forEach(function(dim, idx){
    if (idx < 3) {
      adjusted[dim] = Math.min(adjusted[dim] * 1.15, adjusted[dim] + 0.03);
    } else if (dimAnalysis[dim] < 0.3) {
      adjusted[dim] = Math.max(adjusted[dim] * 0.9, adjusted[dim] - 0.02);
    }
  });
  var sumExCo = 0;
  for (var k in adjusted) { if (k !== 'coScore') sumExCo += adjusted[k]; }
  if (sumExCo > 0) {
    var target = 1.0 - adjusted.coScore;
    for (var k in adjusted) { if (k !== 'coScore') adjusted[k] = adjusted[k] / sumExCo * target; }
  }
  try {
    localStorage.setItem('ssq_adaptive_weights', JSON.stringify(adjusted));
    console.log('SSQ回溯验证权重已优化:', adjusted);
  } catch(e) {}
}

// KL8多期回溯验证
function runKL8Backtest() {
  var historyStr = document.getElementById('kl8-history').value;
  var lines = historyStr.trim().split('\n').filter(function(l){ return l.trim(); });
  var history = [];
  for (var i = 0; i < lines.length; i++) {
    var nums = parseNums(lines[i]);
    if (nums.length >= 10) history.push(nums.slice(0,20).sort(function(a,b){return a-b;}));
  }
  if (history.length < 15) { alert('请至少输入15期历史数据进行回溯验证'); return; }

  var periods = Math.min(10, history.length - 5);
  var results = [];
  var dimensionHits = { wf:0, mpScore:0, mkScore:0, zoneScore:0, neighborScore:0, oddEvenScore:0, bigSmallScore:0, lastMissScore:0 };
  var dimensionTotal = { wf:0, mpScore:0, mkScore:0, zoneScore:0, neighborScore:0, oddEvenScore:0, bigSmallScore:0, lastMissScore:0 };

  for (var p = 0; p < periods; p++) {
    var actual = history[p];
    var simHistory = history.slice(p+1, p+6);
    var last = simHistory[0];
    var scores = scoreKL8Numbers(last, simHistory.slice(1));
    var topNums = scores.slice(0,20).map(function(s){return s.num;});
    var hits = topNums.filter(function(n){ return actual.indexOf(n) >= 0; });

    results.push({
      period: p + 1,
      actual: actual,
      predicted: topNums,
      hits: hits,
      hitCount: hits.length
    });

    hits.forEach(function(n){
      for (var i = 0; i < scores.length; i++) {
        if (scores[i].num === n) {
          for (var dim in dimensionHits) {
            if (scores[i][dim] !== undefined) {
              dimensionHits[dim] += scores[i][dim];
              dimensionTotal[dim]++;
            }
          }
          break;
        }
      }
    });
  }

  var dimAnalysis = {};
  for (var dim in dimensionHits) {
    dimAnalysis[dim] = dimensionTotal[dim] > 0 ? dimensionHits[dim] / dimensionTotal[dim] : 0;
  }

  var html = '<div style="padding:0.5rem">';
  var totalHits = results.reduce(function(s,r){return s+r.hitCount;},0);
  var avgHit = (totalHits / periods).toFixed(2);

  html += '<div style="margin-bottom:1rem;padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">回溯验证汇总（最近'+periods+'期）</div>';
  html += '<div style="display:flex;gap:1rem;flex-wrap:wrap">';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent);color:#000;border-radius:6px;font-weight:bold">平均命中: '+avgHit+'/20</div>';
  html += '<div style="padding:0.5rem 1rem;background:var(--accent3);color:#000;border-radius:6px;font-weight:bold">命中率: '+(totalHits/periods/20*100).toFixed(1)+'%</div>';
  html += '</div></div>';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">命中号码维度特征分析</div>';
  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  html += '<thead><tr style="background:var(--bg3)"><th style="padding:6px;border:1px solid var(--rule)">维度</th><th style="padding:6px;border:1px solid var(--rule)">命中平均得分</th><th style="padding:6px;border:1px solid var(--rule)">有效性</th></tr></thead><tbody>';
  var dimNames = { wf:'频率', mpScore:'遗漏回补', mkScore:'周期驱动', zoneScore:'区间', neighborScore:'邻号', oddEvenScore:'奇偶', bigSmallScore:'大小', lastMissScore:'遗漏' };
  var sortedDims = Object.keys(dimAnalysis).sort(function(a,b){return dimAnalysis[b]-dimAnalysis[a];});
  sortedDims.forEach(function(dim){
    var val = dimAnalysis[dim];
    var effective = val > 0.6 ? '高' : val > 0.4 ? '中' : '低';
    var color = val > 0.6 ? 'var(--accent3)' : val > 0.4 ? 'var(--accent)' : 'var(--muted)';
    html += '<tr><td style="padding:6px;border:1px solid var(--rule)">'+(dimNames[dim]||dim)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center">'+(val*100).toFixed(1)+'</td>';
    html += '<td style="padding:6px;border:1px solid var(--rule);text-align:center;color:'+color+';font-weight:bold">'+effective+'</td></tr>';
  });
  html += '</tbody></table></div></div>';

  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">每期回测详情</div>';
  results.forEach(function(r){
    html += '<div style="margin-bottom:0.5rem;padding:0.6rem;background:var(--bg3);border-radius:6px;border:1px solid var(--rule);font-size:0.8rem">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span>第'+r.period+'期</span>';
    html += '<span style="color:var(--accent);font-weight:bold">命中'+r.hitCount+'/20</span>';
    html += '</div>';
    html += '<div style="margin-top:0.3rem;color:var(--muted)">命中: '+r.hits.map(function(n){return pad(n);}).join(',')+'</div>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div style="padding:0.8rem;background:var(--bg3);border-radius:8px;border:1px solid var(--rule)">';
  html += '<div style="font-weight:bold;color:var(--ink);margin-bottom:0.5rem">下期推荐优化建议</div>';
  var topDims = sortedDims.slice(0,3);
  html += '<div style="font-size:0.8rem;color:var(--muted)">根据回溯验证，以下维度命中率最高，下期推荐将自动提升这些维度的权重：</div>';
  html += '<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap">';
  topDims.forEach(function(dim){
    html += '<span style="padding:0.3rem 0.6rem;background:var(--accent);color:#000;border-radius:4px;font-size:0.75rem;font-weight:bold">'+(dimNames[dim]||dim)+'</span>';
  });
  html += '</div></div>';

  html += '</div>';
  document.getElementById('kl8-backtest-results').innerHTML = html;

  var w = getKL8AdaptiveWeights();
  var adjusted = {};
  for (var k in w) adjusted[k] = w[k];
  sortedDims.forEach(function(dim, idx){
    if (idx < 3) {
      adjusted[dim] = Math.min(adjusted[dim] * 1.15, adjusted[dim] + 0.03);
    } else if (dimAnalysis[dim] < 0.3) {
      adjusted[dim] = Math.max(adjusted[dim] * 0.9, adjusted[dim] - 0.02);
    }
  });
  var sumAll = 0;
  for (var k in adjusted) sumAll += adjusted[k];
  if (sumAll > 0) {
    for (var k in adjusted) adjusted[k] = adjusted[k] / sumAll;
  }
  try {
    localStorage.setItem('kl8_adaptive_weights', JSON.stringify(adjusted));
    console.log('KL8回溯验证权重已优化:', adjusted);
  } catch(e) {}
}
