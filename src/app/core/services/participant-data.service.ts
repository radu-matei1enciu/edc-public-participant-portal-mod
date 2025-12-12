import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ParticipantData {
  participant: any;
  contactInfo: {
    name: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ParticipantDataService {
  private participantDataSubject = new BehaviorSubject<ParticipantData | null>(null);

  setParticipantData(data: ParticipantData): void {
    this.participantDataSubject.next(data);
  }

  getParticipantData(): ParticipantData | null {
    return this.participantDataSubject.value;
  }
}
