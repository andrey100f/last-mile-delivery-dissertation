import {Component, inject, OnInit} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import {HealthService} from '@core/services/health/health';
import {MessageService} from 'primeng/api';

@Component({
  selector: 'app-placeholder',
  imports: [ButtonModule],
  templateUrl: './placeholder.html',
  styleUrl: './placeholder.css',
})
export class Placeholder implements OnInit {
  private readonly _healthService = inject(HealthService);
  private readonly _messageService = inject(MessageService);

  ngOnInit(): void {
    this._healthService.getHealth()
      .subscribe({
        next: data => {
          console.log(data);
        },
        error: () => {
          this._messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
          });
        }
    });
  }
}
