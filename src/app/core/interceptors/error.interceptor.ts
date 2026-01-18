import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unknown error occurred';
        
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Error: ${error.error.message}`;
        } else {
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else {
            switch (error.status) {
              case 400:
                errorMessage = 'Invalid request. Check the entered data.';
                break;
              case 401:
                errorMessage = 'Unauthorized. Please log in.';
                break;
              case 403:
                errorMessage = 'Access denied. You do not have the necessary permissions.';
                break;
              case 404:
                errorMessage = 'Resource not found.';
                break;
              case 409:
                errorMessage = 'Conflict. The participant may already exist.';
                break;
              case 422:
                errorMessage = 'Invalid data. Check the required fields.';
                break;
              case 500:
                errorMessage = 'Internal server error. Please try again later.';
                break;
              default:
                errorMessage = `Server error: ${error.status}`;
            }
          }
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
