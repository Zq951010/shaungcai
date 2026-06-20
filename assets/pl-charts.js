/**
 * 排列三 / 排列五 - 图表渲染模块
 * 使用 ECharts 绘制排列三和排列五的所有可视化图表
 */

(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var accent4 = style.getPropertyValue('--accent4').trim();
  var accent5 = style.getPropertyValue('--accent5').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var bg = style.getPropertyValue('--bg').trim();

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

  /**
   * 排列三 - 和值走势折线图（带均值线）
   * @param {number[]} sums - 每期和值数组，按时间正序
   */
  window.renderPL3SumChart = function(sums) {
    var chart = getOrCreate('chart-pl3-sum');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(sums.reduce(function(a, b) { return a + b; }, 0) / sums.length);
    for (var i = sums.length - 1; i >= 0; i--) {
      periods.push('第' + (sums.length - i) + '期');
      data.push(sums[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6,
          lineStyle: { color: accent3, width: 2 }, itemStyle: { color: accent3 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent3 + '40' }, { offset: 1, color: accent3 + '05' }] } }
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  /**
   * 排列三 - 跨度走势柱状图（带均值线）
   * @param {number[]} spans - 每期跨度数组，按时间正序
   */
  window.renderPL3SpanChart = function(spans) {
    var chart = getOrCreate('chart-pl3-span');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(spans.reduce(function(a, b) { return a + b; }, 0) / spans.length);
    for (var i = spans.length - 1; i >= 0; i--) {
      periods.push('第' + (spans.length - i) + '期');
      data.push(spans[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'bar', data: data, barWidth: '50%',
          itemStyle: { color: function(p) { return p.value >= avgVal ? accent3 : accent2; }, borderRadius: [3, 3, 0, 0] }
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  /**
   * 排列三 - 0-9号码频率柱状图（带期望线）
   * @param {Object} freqMap - {0: count, 1: count, ...}
   * @param {number} expected - 期望频率值
   */
  window.renderPL3FreqChart = function(freqMap, expected) {
    var chart = getOrCreate('chart-pl3-freq');
    if (!chart) return;

    var nums = [];
    var freqs = [];
    for (var n = 0; n <= 9; n++) {
      nums.push(String(n));
      freqs.push(freqMap[n] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'bar', barWidth: '60%',
          data: freqs.map(function(f) {
            return {
              value: f,
              itemStyle: { color: f >= expected * 1.3 ? accent4 : f >= expected ? accent3 : f >= expected * 0.7 ? accent2 : accent2 + '66', borderRadius: [2, 2, 0, 0] }
            };
          })
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  /**
   * 排列三 - 奇偶比堆叠柱状图
   * @param {Array} oddEvenRatios - [{odd: n, even: n}, ...] 按时间正序
   */
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
        { name: '奇数', type: 'bar', stack: 'oe', data: oddData, itemStyle: { color: accent3 } },
        { name: '偶数', type: 'bar', stack: 'oe', data: evenData, itemStyle: { color: accent } }
      ]
    });
  };

  /**
   * 排列三 - 尾数频率柱状图（带期望线）
   * @param {Object} tailFreq - {0: count, 1: count, ...}
   * @param {number} expected - 期望频率值
   */
  window.renderPL3TailChart = function(tailFreq, expected) {
    var chart = getOrCreate('chart-pl3-tail');
    if (!chart) return;

    var tails = [];
    var freqs = [];
    for (var t = 0; t <= 9; t++) {
      tails.push('尾' + t);
      freqs.push(tailFreq[t] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: tails, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'bar', barWidth: '50%',
          data: freqs.map(function(f) {
            return {
              value: f,
              itemStyle: { color: f >= expected * 1.15 ? accent4 : f >= expected * 0.85 ? accent3 : accent2, borderRadius: [3, 3, 0, 0] }
            };
          })
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  /**
   * 排列三 - 各号码遗漏期数柱状图
   * @param {Object} missData - {0: miss, 1: miss, ...}
   */
  window.renderPL3MissChart = function(missData) {
    var chart = getOrCreate('chart-pl3-miss');
    if (!chart) return;

    var nums = [];
    var misses = [];
    var totalMiss = 0;
    for (var n = 0; n <= 9; n++) {
      nums.push(String(n));
      misses.push(missData[n] || 0);
      totalMiss += (missData[n] || 0);
    }
    var avgMiss = totalMiss / 10;

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'bar', barWidth: '50%',
          data: misses.map(function(m) {
            var color;
            if (m === 0) color = accent;
            else if (m <= avgMiss * 0.5) color = accent3;
            else if (m >= avgMiss * 1.5) color = accent4;
            else color = accent2;
            return { value: m, itemStyle: { color: color, borderRadius: [3, 3, 0, 0] } };
          })
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: Math.round(avgMiss) }], lineStyle: { color: accent, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  // ==================== 排列五图表 ====================

  /**
   * 排列五 - 和值走势折线图（带均值线）
   * @param {number[]} sums - 每期和值数组，按时间正序
   */
  window.renderPL5SumChart = function(sums) {
    var chart = getOrCreate('chart-pl5-sum');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(sums.reduce(function(a, b) { return a + b; }, 0) / sums.length);
    for (var i = sums.length - 1; i >= 0; i--) {
      periods.push('第' + (sums.length - i) + '期');
      data.push(sums[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6,
          lineStyle: { color: accent5, width: 2 }, itemStyle: { color: accent5 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent5 + '40' }, { offset: 1, color: accent5 + '05' }] } }
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  /**
   * 排列五 - 跨度走势柱状图（带均值线）
   * @param {number[]} spans - 每期跨度数组，按时间正序
   */
  window.renderPL5SpanChart = function(spans) {
    var chart = getOrCreate('chart-pl5-span');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(spans.reduce(function(a, b) { return a + b; }, 0) / spans.length);
    for (var i = spans.length - 1; i >= 0; i--) {
      periods.push('第' + (spans.length - i) + '期');
      data.push(spans[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'bar', data: data, barWidth: '50%',
          itemStyle: { color: function(p) { return p.value >= avgVal ? accent5 : accent2; }, borderRadius: [3, 3, 0, 0] }
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  /**
   * 排列五 - 0-9号码频率柱状图（带期望线）
   * @param {Object} freqMap - {0: count, 1: count, ...}
   * @param {number} expected - 期望频率值
   */
  window.renderPL5FreqChart = function(freqMap, expected) {
    var chart = getOrCreate('chart-pl5-freq');
    if (!chart) return;

    var nums = [];
    var freqs = [];
    for (var n = 0; n <= 9; n++) {
      nums.push(String(n));
      freqs.push(freqMap[n] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'bar', barWidth: '60%',
          data: freqs.map(function(f) {
            return {
              value: f,
              itemStyle: { color: f >= expected * 1.3 ? accent4 : f >= expected ? accent5 : f >= expected * 0.7 ? accent2 : accent2 + '66', borderRadius: [2, 2, 0, 0] }
            };
          })
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  /**
   * 排列五 - 奇偶比堆叠柱状图
   * @param {Array} oddEvenRatios - [{odd: n, even: n}, ...] 按时间正序
   */
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
        { name: '奇数', type: 'bar', stack: 'oe', data: oddData, itemStyle: { color: accent5 } },
        { name: '偶数', type: 'bar', stack: 'oe', data: evenData, itemStyle: { color: accent2 } }
      ]
    });
  };

  /**
   * 排列五 - 尾数频率柱状图（带期望线）
   * @param {Object} tailFreq - {0: count, 1: count, ...}
   * @param {number} expected - 期望频率值
   */
  window.renderPL5TailChart = function(tailFreq, expected) {
    var chart = getOrCreate('chart-pl5-tail');
    if (!chart) return;

    var tails = [];
    var freqs = [];
    for (var t = 0; t <= 9; t++) {
      tails.push('尾' + t);
      freqs.push(tailFreq[t] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: tails, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'bar', barWidth: '50%',
          data: freqs.map(function(f) {
            return {
              value: f,
              itemStyle: { color: f >= expected * 1.15 ? accent4 : f >= expected * 0.85 ? accent5 : accent2, borderRadius: [3, 3, 0, 0] }
            };
          })
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

  /**
   * 排列五 - 各号码遗漏期数柱状图
   * @param {Object} missData - {0: miss, 1: miss, ...}
   */
  window.renderPL5MissChart = function(missData) {
    var chart = getOrCreate('chart-pl5-miss');
    if (!chart) return;

    var nums = [];
    var misses = [];
    var totalMiss = 0;
    for (var n = 0; n <= 9; n++) {
      nums.push(String(n));
      misses.push(missData[n] || 0);
      totalMiss += (missData[n] || 0);
    }
    var avgMiss = totalMiss / 10;

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        {
          type: 'bar', barWidth: '50%',
          data: misses.map(function(m) {
            var color;
            if (m === 0) color = accent;
            else if (m <= avgMiss * 0.5) color = accent5;
            else if (m >= avgMiss * 1.5) color = accent4;
            else color = accent2;
            return { value: m, itemStyle: { color: color, borderRadius: [3, 3, 0, 0] } };
          })
        },
        {
          type: 'line',
          markLine: { data: [{ yAxis: Math.round(avgMiss) }], lineStyle: { color: accent, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent, fontSize: 10 } },
          data: []
        }
      ]
    });
  };

})();
