import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CandleService {
  SERVER = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getCandles(symbol: string, interval: string, strategy: string, positions: number, year: number): Observable<HttpResponse<any>> {
    return this.http.get<any>(
      `${this.SERVER}candle/candles?symbol=${symbol}&interval=${interval}&strategy=${strategy}&positions=${positions}&year=${year}`,
      { observe: 'response' }
    );
  }
}
