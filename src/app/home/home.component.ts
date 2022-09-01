import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IsLoadingService } from '@service-work/is-loading';
import { BarPrices, createChart, IChartApi, ISeriesApi, SeriesMarker, Time, UTCTimestamp } from 'lightweight-charts';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable } from 'rxjs/internal/Observable';
import { CandleService } from '../core/candle.service';

interface PositionData {
  open: number;
  close: number;
  openDate: Date;
  openTime: Time;
  closeDate: Date;
  closeTime: Time;
  profit: number;
  percentage: number;
  toBeat: number;
}

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Position {
  time: string;
  price: number;
  long: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})

//TODO start moving to separate files
//TODO start moving to separate files
//TODO start moving to separate files
export class HomeComponent implements OnInit {
  constructor(
    private candleService: CandleService,
    private route: ActivatedRoute,
    private isLoadingService: IsLoadingService,
    private deviceService: DeviceDetectorService
  ) {}

  isMobile: boolean = false;

  isLoading: Observable<boolean> | undefined;
  cContainer: HTMLElement | undefined;
  positionList: Position[] = [];
  toBeat: string = '0';
  startOpen: string = '0';
  startDate: Date = new Date(Date.now());
  data: Candle[] = [];
  ogData: Candle[] = [];
  singlas: SeriesMarker<Time>[] = [];

  chartContainer!: HTMLElement;
  perfChartContainer!: HTMLElement;

  positionDataList: PositionData[] = [];
  ogPositionDataList: PositionData[] = [];
  chart: IChartApi | undefined;
  perfChart: IChartApi | undefined;
  ohlcSeries: ISeriesApi<'Candlestick'> | undefined;
  lineSeries: ISeriesApi<'Line'>[] = [];
  perfLineSeries: ISeriesApi<'Line'> | undefined;
  hodlLineSeries: ISeriesApi<'Line'> | undefined;
  interval: string = '15min';
  year: number = 2020;
  commission = 0.999;
  leStart = 0;
  version: string = 'btc_15m_og';
  loading = true;
  tmpV: string = '1';

  ngOnInit() {
    this.isMobile = this.deviceService.isMobile();
    this.isLoading = this.isLoadingService.isLoading$();
    

    this.isLoadingService.isLoading$().subscribe((value) => {
      this.loading = value;
    });

    this.route.queryParams.subscribe((params) => {
      if (params.v) this.tmpV = params.v;
      this.version = params.v;
      if (this.tmpV === '2') {
        this.version = 'btc_15m_v2';
      } else {
        this.version = 'btc_15m_og';
      }

      if (params.year && !isNaN(params.year) && params.year >= 2017 && params.year <= 2020) {
        this.year = params.year;
      }
    });
    this.printChart();
  }

  private printChart() {
    if (this.chartContainer) {
      this.chartContainer.innerHTML = '';
    }
    this.loading = true;
    this.isLoadingService.add();
    this.positionDataList = [];
    this.interval = '15min';
    this.candleService.getCandles('btcusdt', '15m', this.version, 999, this.year).subscribe((res) => {
      this.positionList = [];
      for (let i = 0; i < res.body.data.position.length; i++) {
        this.positionList.push(res.body.data.position[i]);
      }

      let profit = 1;
      const openBeat = this.positionList[0].price;
      for (let i = 0; i < this.positionList.length - 1; i = i + 2) {
        const percentage = (this.positionList[i + 1].price - this.positionList[i].price) / this.positionList[i].price;
        profit = profit * (1 + percentage) * this.commission * this.commission;
        this.positionDataList.push({
          open: this.positionList[i].price,
          close: this.positionList[i + 1].price,
          openDate: new Date(+this.positionList[i].time),
          openTime: (+this.positionList[i].time / 1000) as UTCTimestamp,
          closeDate: new Date(+this.positionList[i + 1].time),
          closeTime: (+this.positionList[i + 1].time / 1000) as UTCTimestamp,
          profit: profit,
          percentage: +(percentage * 100).toFixed(3),
          toBeat: +(this.positionList[i + 1].price / openBeat).toFixed(3),
        });
      }

      for (let i = 0; i < this.positionDataList.length; i++) {}

      this.ogPositionDataList = this.positionDataList;

      let s = 0;
      for (let item = 0; item < res.body.data.candle.length; item++) {
        const d = new Date(+res.body.data.candle[item].time);
        if (d.getUTCHours() == 0) {
          s = item;
          break;
        }
      }
      this.data = [];
      for (let item = s; item < res.body.data.candle.length; item++) {
        const t = (res.body.data.candle[item].time / 1000) as UTCTimestamp;
        this.data.push({
          time: t,
          open: res.body.data.candle[item].open,
          high: res.body.data.candle[item].high,
          low: res.body.data.candle[item].low,
          close: res.body.data.candle[item].close,
        });
      }
      this.ogData = this.data;
      this.setChart();
      this.setSeries();
      this.setLegend();
    });
  }

  changeVersion(version: any) {
    if (version.target.value === '1' && this.tmpV !== '1') {
      this.tmpV = '1';
      this.version = 'btc_15m_og';
      this.printChart();
    } else if (version.target.value === '2' && this.tmpV !== '2') {
      this.tmpV = '2';
      this.version = 'btc_15m_v2';
      this.printChart();
    }
  }

  changeYear(y: any) {
    if (y.target.value >= 2017 && y.target.value <= 2020) {
      this.year = y.target.value;
      this.printChart();
    }
  }

  changeStart(close: Time) {
    const tmpPositionList: PositionData[] = [];
    let s = 0;
    let profit = 1;
    let openBeat = 1;
    for (let i = 0; i < this.ogPositionDataList.length; i++) {
      if (new Date(+this.ogPositionDataList[i].closeTime).toUTCString() == new Date(+close).toUTCString()) {
        s = i * 2 - 1;
        break;
      }
    }
    this.leStart = s;
    for (let i = 0; i < s; i = i + 2) {
      const percentage = (this.positionList[i + 1].price - this.positionList[i].price) / this.positionList[i].price;
      tmpPositionList.push({
        open: this.positionList[i].price,
        close: this.positionList[i + 1].price,
        openDate: new Date(+this.positionList[i].time),
        openTime: (+this.positionList[i].time / 1000) as UTCTimestamp,
        closeDate: new Date(+this.positionList[i + 1].time),
        closeTime: (+this.positionList[i + 1].time / 1000) as UTCTimestamp,
        profit: profit,
        percentage: +(percentage * 100).toFixed(3),
        toBeat: +openBeat.toFixed(3),
      });
    }
    openBeat = this.positionList[s + 1].price;
    const perfStart = tmpPositionList.length;
    for (let i = s + 1; i < this.positionList.length - 1; i = i + 2) {
      const percentage = (this.positionList[i + 1].price - this.positionList[i].price) / this.positionList[i].price;
      profit = profit * (1 + percentage) * this.commission * this.commission;
      tmpPositionList.push({
        open: this.positionList[i].price,
        close: this.positionList[i + 1].price,
        openDate: new Date(+this.positionList[i].time),
        openTime: (+this.positionList[i].time / 1000) as UTCTimestamp,
        closeDate: new Date(+this.positionList[i + 1].time),
        closeTime: (+this.positionList[i + 1].time / 1000) as UTCTimestamp,
        profit: profit,
        percentage: +(percentage * 100).toFixed(3),
        toBeat: +(this.positionList[i + 1].price / openBeat).toFixed(3),
      });
    }
    this.positionDataList = tmpPositionList;
    this.perfHodl(perfStart, true);
  }

  percentageChange(per: any) {
    const tmpPositionList: PositionData[] = [];
    const com = per.target.value > 0 ? per.target.value / 100 : 0;
    this.commission = 1 - com;
    let profit = 1;
    let openBeat = 1;
    for (let i = 0; i < this.leStart; i = i + 2) {
      const percentage = (this.positionList[i + 1].price - this.positionList[i].price) / this.positionList[i].price;
      tmpPositionList.push({
        open: this.positionList[i].price,
        close: this.positionList[i + 1].price,
        openDate: new Date(+this.positionList[i].time),
        openTime: (+this.positionList[i].time / 1000) as UTCTimestamp,
        closeDate: new Date(+this.positionList[i + 1].time),
        closeTime: (+this.positionList[i + 1].time / 1000) as UTCTimestamp,
        profit: profit,
        percentage: +(percentage * 100).toFixed(3),
        toBeat: +openBeat.toFixed(3),
      });
    }
    openBeat = this.positionList[this.leStart].price;
    const s = this.leStart > 0 ? this.leStart + 1 : 0;
    for (let i = s; i < this.positionList.length - 1; i = i + 2) {
      const percentage = (this.positionList[i + 1].price - this.positionList[i].price) / this.positionList[i].price;
      profit = profit * (1 + percentage) * this.commission * this.commission;
      tmpPositionList.push({
        open: this.positionList[i].price,
        close: this.positionList[i + 1].price,
        openDate: new Date(+this.positionList[i].time),
        openTime: (+this.positionList[i].time / 1000) as UTCTimestamp,
        closeDate: new Date(+this.positionList[i + 1].time),
        closeTime: (+this.positionList[i + 1].time / 1000) as UTCTimestamp,
        profit: profit,
        percentage: +(percentage * 100).toFixed(3),
        toBeat: +(this.positionList[i + 1].price / openBeat).toFixed(3),
      });
    }
    this.positionDataList = tmpPositionList;
  }

  sleep(milliseconds: number) {
    var start = new Date().getTime();
    for (var i = 0; i < 9999999; i++) {
      if (new Date().getTime() - start > milliseconds) {
        break;
      }
    }
  }

  async tmpChangeChart(inter: any) {
    this.changeChart(inter);
  }

  changeChart(inter: any) {
    if (inter !== '') {
      let tmpData: Candle[] = [];
      let startDate = this.ogData[0].time.valueOf();
      this.loading = true;
      this.isLoadingService.add();
      if (inter == '4h') {
        this.interval = '4h';
        let k = 0;
        for (let i = 1; i < this.ogData.length; i++) {
          const nextDate = startDate + 16 * 15 * 60;
          const open = this.ogData[i - 1].open;
          let high = this.ogData[i - 1].high;
          let low = this.ogData[i - 1].low;
          for (let j = i; j < this.ogData.length; j++) {
            if (this.ogData[j].high > high) {
              high = this.ogData[j].high;
            }
            if (this.ogData[j].low < low) {
              low = this.ogData[j].low;
            }
            if (this.ogData[j].time.valueOf() >= nextDate) {
              break;
            }
            k = j;
            i++;
          }
          tmpData.push({
            time: startDate as UTCTimestamp,
            open: open,
            high: high,
            low: low,
            close: this.ogData[k].close,
          });
          startDate = nextDate;
        }
      } else if (inter == '1h') {
        this.interval = '1h';
        let k = 0;
        for (let i = 1; i < this.ogData.length; i++) {
          const nextDate = startDate + 4 * 15 * 60;
          const open = this.ogData[i - 1].open;
          let high = this.ogData[i - 1].high;
          let low = this.ogData[i - 1].low;
          for (let j = i; j < this.ogData.length; j++) {
            if (this.ogData[j].high > high) {
              high = this.ogData[j].high;
            }
            if (this.ogData[j].low < low) {
              low = this.ogData[j].low;
            }
            if (this.ogData[j].time.valueOf() >= nextDate) {
              break;
            }
            k = j;
            i++;
          }
          tmpData.push({
            time: startDate as UTCTimestamp,
            open: open,
            high: high,
            low: low,
            close: this.ogData[k].close,
          });
          startDate = nextDate;
        }
      } else if (inter == '1d') {
        this.interval = '1d';
        let k = 0;
        for (let i = 1; i < this.ogData.length; i++) {
          const nextDate = startDate + 96 * 15 * 60;
          const open = this.ogData[i - 1].open;
          let high = this.ogData[i - 1].high;
          let low = this.ogData[i - 1].low;
          for (let j = i; j < this.ogData.length; j++) {
            if (this.ogData[j].high > high) {
              high = this.ogData[j].high;
            }
            if (this.ogData[j].low < low) {
              low = this.ogData[j].low;
            }
            if (this.ogData[j].time.valueOf() >= nextDate) {
              break;
            }
            k = j;
            i++;
          }
          tmpData.push({
            time: startDate as UTCTimestamp,
            open: open,
            high: high,
            low: low,
            close: this.ogData[k].close,
          });
          startDate = nextDate;
        }
      } else if (inter == '15min') {
        this.interval = '15min';
        tmpData = this.ogData;
      }

      this.data = tmpData;
      const tmpPositionList: Position[] = [];
      let dataStart = 1;
      for (let i = 0; i < this.positionList.length; i++) {
        const searchingPos = (+this.positionList[i].time / 1000) as UTCTimestamp;
        for (let j = dataStart; j < this.data.length; j++) {
          if (this.data[j].time > searchingPos) {
            tmpPositionList.push({
              time: (this.data[j - 1].time.valueOf() * 1000).toString(),
              price: this.positionList[i].price,
              long: this.positionList[i].long,
            });
            dataStart = j;
            break;
          }
        }
      }
      this.singlas = this.setMarkers(tmpPositionList);
      this.markerLines(tmpPositionList, true);
      this.ohlcSeries?.setMarkers(this.singlas);
      this.ohlcSeries?.setData(this.data);
      this.loading = false;
      this.isLoadingService.remove();
    }
  }

  private perfHodl(start: number, change: boolean) {
    if (change) {
      if (this.perfLineSeries) {
        this.perfChart?.removeSeries(this.perfLineSeries);
      }
      if (this.hodlLineSeries) {
        this.perfChart?.removeSeries(this.hodlLineSeries);
      }
    }
    this.perfLineSeries = this.perfChart?.addLineSeries({ color: 'green' });
    this.hodlLineSeries = this.perfChart?.addLineSeries({ color: 'red' });
    const perfData = [];
    const hodlData = [];
    if (start <= -1) {
      start = 0;
    }
    for (let i = start; i < this.positionDataList.length; i++) {
      perfData.push({
        time: +this.positionDataList[i].closeTime as UTCTimestamp,
        value: this.positionDataList[i].profit,
      });
      hodlData.push({
        time: +this.positionDataList[i].closeTime as UTCTimestamp,
        value: this.positionDataList[i].toBeat,
      });
    }
    this.perfLineSeries?.setData(perfData);
    this.hodlLineSeries?.setData(hodlData);
    this.perfLineSeries?.applyOptions({
      priceFormat: {
        type: 'price',
        precision: 3,
        minMove: 0.001,
      },
    });
    this.hodlLineSeries?.applyOptions({
      priceFormat: {
        type: 'price',
        precision: 3,
        minMove: 0.001,
      },
    });
    this.perfChart?.timeScale().setVisibleRange({
      from: +this.positionDataList[start].closeTime as UTCTimestamp,
      to: +this.positionDataList[this.positionDataList.length - 1].closeTime as UTCTimestamp,
    });
  }

  resetPerfChart() {
    this.perfChart?.timeScale().setVisibleRange({
      from: +this.positionDataList[0].closeTime as UTCTimestamp,
      to: +this.positionDataList[this.positionDataList.length - 1].closeTime as UTCTimestamp,
    });
  }

  private removeAdd() {
    if (this.ohlcSeries && this.chart) {
      this.chart!.removeSeries(this.ohlcSeries);
      this.ohlcSeries = this.chart.addCandlestickSeries();
    }
  }

  private markerLines(positions: Position[], rem: boolean) {
    if (this.chart) {
      if (rem) {
        for (let i = 0; i < this.lineSeries.length; i++) {
          this.chart.removeSeries(this.lineSeries[i]);
        }
      }
      this.lineSeries = [];
      for (let i = 0; i < positions.length - 1; i = i + 2) {
        const a = this.chart.addLineSeries({ lineWidth: 2 });
        a.applyOptions({ priceLineVisible: false, lastValueVisible: false });
        const start = { time: (+positions[i].time / 1000) as UTCTimestamp, value: positions[i].price };
        const end = { time: (+positions[i + 1].time / 1000) as UTCTimestamp, value: positions[i + 1].price };
        a.setData([start, end]);
        this.lineSeries.push(a);
      }
    }
  }

  private setMarkers(pos: Position[]): SeriesMarker<Time>[] {
    const res: SeriesMarker<Time>[] = [];
    let buyPrice = 0;
    for (let i = 0; i < pos.length; i++) {
      if (pos[i].long) {
        res.push({
          time: (+pos[i].time / 1000) as UTCTimestamp,
          position: 'belowBar',
          color: '#025417',
          shape: 'arrowUp',
          size: 1,
          text: pos[i].price.toFixed(3),
        });
        buyPrice = pos[i].price;
      } else if (!pos[i].long) {
        res.push({
          time: (+pos[i].time / 1000) as UTCTimestamp,
          position: 'aboveBar',
          color: '#ab057f',
          size: 1,
          shape: 'arrowDown',
          text: pos[i].price.toFixed(3),
        });
      }
    }
    return res;
  }

  setLegend() {
    if (this.chart) {
      const firstRow = document.getElementById(`legend`) as HTMLElement;
      firstRow.innerHTML = '';
      firstRow.innerText = 'BTCUSD';
      firstRow.style.color = 'black';

      this.chart.subscribeCrosshairMove((param) => {
        if (!param.time || !this.ohlcSeries) return;

        const price = param.seriesPrices.get(this.ohlcSeries) as BarPrices;

        if (price) {
          firstRow.innerText = `O: ${price.open.toFixed(3)} H: ${price.high.toFixed(3)} L: ${price.low.toFixed(
            3
          )} C: ${price.close.toFixed(3)}`;
        }
      });
    }
    if (this.perfChart) {
      const firstRow = document.getElementById(`perfLegend`) as HTMLElement;
      firstRow.innerHTML = '';
      firstRow.innerText = '';
      firstRow.style.color = 'black';
      this.perfChart.subscribeCrosshairMove((param) => {
        if (!param.time || !this.perfLineSeries || !this.hodlLineSeries) return;
        let text = '';
        text += `<span style="color:green"> Profit:</span> ${(
          param.seriesPrices.get(this.perfLineSeries) as Number
        ).toFixed(3)}`;
        text += `<span style="color:red"> Hodl:</span> ${param.seriesPrices.get(this.hodlLineSeries)}`;
        firstRow.innerHTML = text;
      });
    }
  }

  goToEnd(isStart: boolean) {
    if (this.chart) {
      if (isStart) {
        this.chart.timeScale().scrollToPosition(0, false);
      } else {
        this.chart.timeScale().scrollToPosition(-this.data.length, false);
      }
    }
  }

  goToDate(_time: Time) {
    if (this.chart) {
      if (this.interval === '15min') {
        const index = this.data.findIndex((data) => data.time === _time);
        this.chart.timeScale().scrollToPosition(-(this.data.length - index - 150), false);
      } else if (this.interval === '1h') {
        for (let i = 1; i < 5; i++) {
          const t = +_time - i * 15 * 60;
          const d = new Date(t * 1000);
          if (d.getUTCMinutes() == 0) {
            const index = this.data.findIndex((data) => data.time === t);
            this.chart.timeScale().scrollToPosition(-(this.data.length - index - 150), false);
            break;
          }
        }
      } else if (this.interval === '4h') {
        for (let i = 1; i < 17; i++) {
          const t = +_time - i * 15 * 60;
          const d = new Date(t * 1000);
          if (d.getUTCMinutes() == 0 && (d.getUTCHours() == 0 || d.getUTCHours() % 4 == 0)) {
            const index = this.data.findIndex((data) => data.time === t);
            this.chart.timeScale().scrollToPosition(-(this.data.length - index - 150), false);
            break;
          }
        }
      } else if (this.interval === '1d') {
        for (let i = 1; i < 97; i++) {
          const t = +_time - i * 15 * 60;
          const d = new Date(t * 1000);
          if (d.getUTCMinutes() == 0 && d.getUTCHours() == 0) {
            const index = this.data.findIndex((data) => data.time === t);
            this.chart.timeScale().scrollToPosition(-(this.data.length - index - 150), false);
            break;
          }
        }
      }
    }
  }

  private setChart() {
    this.chartContainer = document.getElementById(`main-chart`) as HTMLElement;
    this.perfChartContainer = document.getElementById(`perf-chart`) as HTMLElement;

    if (this.chart) {
      this.chart.remove();
      this.chart = undefined;
    }
    if (this.perfChart) {
      this.perfChart.remove();
      this.perfChart = undefined;
    }
    if (!this.chart) {
      this.chart = createChart(this.chartContainer, {
        width: window.innerWidth * 0.95,
        height: window.innerHeight * 0.85,
        rightPriceScale: {
          borderVisible: true,
        },
        timeScale: {
          fixLeftEdge: true,
          lockVisibleTimeRangeOnResize: true,
          rightBarStaysOnScroll: false,
          borderVisible: true,
          borderColor: '#313552',
          visible: true,
          timeVisible: true,
          secondsVisible: true,
        },
        crosshair: {
          vertLine: {
            width: 1,
            style: 1,
            visible: true,
            labelVisible: true,
          },
          horzLine: {
            width: 1,
            style: 1,
            visible: true,
            labelVisible: true,
          },
          mode: 0,
        },
      });
      this.chart.priceScale().applyOptions({ mode: 1 });
      this.chart.applyOptions({ overlayPriceScales: { mode: 1 } });
    }
    // TODO change precision for x.xx to x.xxx
    if (!this.perfChart) {
      this.perfChart = createChart(this.perfChartContainer, {
        width: window.innerWidth * 0.95,
        height: window.innerHeight * 0.5,
        rightPriceScale: {
          borderVisible: true,
        },
        timeScale: {
          fixLeftEdge: true,
          lockVisibleTimeRangeOnResize: true,
          rightBarStaysOnScroll: false,
          borderVisible: true,
          borderColor: '#313552',
          visible: true,
          timeVisible: true,
          secondsVisible: true,
        },
        crosshair: {
          vertLine: {
            width: 1,
            style: 1,
            visible: true,
            labelVisible: true,
          },
          horzLine: {
            width: 1,
            style: 1,
            visible: true,
            labelVisible: true,
          },
          mode: 0,
        },
      });
      this.perfChart.priceScale().applyOptions({ mode: 0 });
      this.perfChart.applyOptions({ overlayPriceScales: { mode: 0 } });
    }
  }

  private setSeries() {
    if (this.chart) {
      this.ohlcSeries = this.chart.addCandlestickSeries();
      this.ohlcSeries.applyOptions({ priceLineVisible: false });
      this.ohlcSeries.setData(this.data);
      this.singlas = this.setMarkers(this.positionList);
      this.ohlcSeries.setMarkers(this.singlas);
      this.markerLines(this.positionList, false);
      this.loading = false;
      this.isLoadingService.remove();
    }
    if (this.perfChart) {
      this.perfHodl(0, false);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    if (!this.isMobile) {
      if (this.chart) {
        this.chart.applyOptions({
          width: window.innerWidth * 0.95,
          height: window.innerHeight * 0.85,
        });
      }
      if (this.perfChart) {
        this.perfChart.applyOptions({
          width: window.innerWidth * 0.95,
          height: window.innerHeight * 0.5,
        });
      }
    }
  }
}
