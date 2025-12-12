import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ParticipantService } from '../../core/services/participant.service';
import { ParticipantRegistrationRequest, ParticipantMetadata, UserMetadata } from '../../core/models/participant.model';
import { ConfigService } from '../../core/services/config.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl w-full space-y-8">
        <!-- Header -->
        <div class="text-center">
          <div class="mx-auto h-16 w-16 bg-primary-800 rounded-full flex items-center justify-center mb-4">
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-gray-900">Sign Up for DataSpace</h2>
          <p class="mt-2 text-sm text-gray-600">
            Join the DataSpace ecosystem and securely access enterprise data
          </p>
          
          <!-- Dev Mode Indicator -->
          <div *ngIf="configService.config?.features?.enableDevMode" 
               class="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            Development Mode - Pre-populated form
          </div>
        </div>

        <!-- Registration Form -->
        <div class="bg-white shadow-xl rounded-lg overflow-hidden">
          <form [formGroup]="registrationForm" (ngSubmit)="onSubmit()" class="space-y-6 p-8">
            
            <!-- Step Indicator -->
            <div class="flex items-center justify-center mb-8">
              <div class="flex items-center space-x-4">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    {{ currentStep >= 1 ? 'bg-primary-800 text-white' : 'bg-gray-200 text-gray-600' }}">
                    1
                  </div>
                  <span class="ml-2 text-sm font-medium text-gray-700">Company Information</span>
                </div>
                <div class="w-16 h-0.5 bg-gray-200"></div>
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    {{ currentStep >= 2 ? 'bg-primary-800 text-white' : 'bg-gray-200 text-gray-600' }}">
                    2
                  </div>
                  <span class="ml-2 text-sm font-medium text-gray-700">User Account</span>
                </div>
                <div class="w-16 h-0.5 bg-gray-200"></div>
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    {{ currentStep >= 3 ? 'bg-primary-800 text-white' : 'bg-gray-200 text-gray-600' }}">
                    3
                  </div>
                  <span class="ml-2 text-sm font-medium text-gray-700">Confirmation</span>
                </div>
              </div>
            </div>

            <!-- Step 1: Company Information -->
            <div *ngIf="currentStep === 1" class="space-y-6">
              <!-- Company Section Header -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div class="flex items-center">
                  <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                  <div>
                    <h3 class="text-lg font-medium text-blue-900">Company Information</h3>
                    <p class="text-sm text-blue-700 mt-1">Tell us about your organization</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label for="participantName" class="form-label">Company Name *</label>
                <input
                  id="participantName"
                  type="text"
                  formControlName="participantName"
                  class="form-input"
                  placeholder="e.g. Tech Solutions SRL"
                  [class.border-red-500]="registrationForm.get('participantName')?.invalid && registrationForm.get('participantName')?.touched"
                >
                <div *ngIf="registrationForm.get('participantName')?.invalid && registrationForm.get('participantName')?.touched" 
                     class="mt-1 text-sm text-red-600">
                  <p *ngIf="registrationForm.get('participantName')?.errors?.['required']">Company name is required</p>
                  <p *ngIf="registrationForm.get('participantName')?.errors?.['minlength']">Minimum 2 characters</p>
                </div>
              </div>

              <div>
                <label for="description" class="form-label">Company Description *</label>
                <textarea
                  id="description"
                  formControlName="description"
                  rows="3"
                  class="form-input"
                  placeholder="Brief description of your company and its activities in the data space"
                  [class.border-red-500]="registrationForm.get('description')?.invalid && registrationForm.get('description')?.touched"
                ></textarea>
                <div *ngIf="registrationForm.get('description')?.invalid && registrationForm.get('description')?.touched" 
                     class="mt-1 text-sm text-red-600">
                  <p *ngIf="registrationForm.get('description')?.errors?.['required']">Company description is required</p>
                  <p *ngIf="registrationForm.get('description')?.errors?.['minlength']">Minimum 10 characters</p>
                </div>
              </div>
               <!-- Additional Company Information -->
              <div class="mt-8">
                <h4 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Additional Company Information
                </h4>
                <p class="text-sm text-gray-600 mb-6">Optional details to help us better understand your organization</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label for="companyType" class="form-label">Company Type</label>
                    <select id="companyType" formControlName="companyType" class="form-input">
                      <option value="">Select company type</option>
                      <option value="SRL">SRL (Società a Responsabilità Limitata)</option>
                      <option value="SPA">SPA (Società per Azioni)</option>
                      <option value="SNC">SNC (Società in Nome Collettivo)</option>
                      <option value="SAS">SAS (Società in Accomandita Semplice)</option>
                      <option value="SRLS">SRLS (Società a Responsabilità Limitata Semplificata)</option>
                      <option value="COOPERATIVE">Cooperativa</option>
                      <option value="CONSORZIO">Consorzio</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label for="vatNumber" class="form-label">VAT Number</label>
                    <input
                      id="vatNumber"
                      type="text"
                      formControlName="vatNumber"
                      class="form-input"
                      placeholder="IT12345678901"
                    >
                  </div>

                  <div>
                    <label for="fiscalCode" class="form-label">Fiscal Code</label>
                    <input
                      id="fiscalCode"
                      type="text"
                      formControlName="fiscalCode"
                      class="form-input"
                      placeholder="RSSMRA80A01H501U"
                    >
                  </div>

                  <div>
                    <label for="email" class="form-label">Company Email</label>
                    <input
                      id="email"
                      type="email"
                      formControlName="email"
                      class="form-input"
                      placeholder="info@company.com"
                      [class.border-red-500]="registrationForm.get('email')?.invalid && registrationForm.get('email')?.touched"
                    >
                    <div *ngIf="registrationForm.get('email')?.invalid && registrationForm.get('email')?.touched" 
                        class="mt-1 text-sm text-red-600">
                      <p *ngIf="registrationForm.get('email')?.errors?.['email']">Please enter a valid email address</p>
                    </div>
                  </div>

                  <div>
                    <label for="phone" class="form-label">Company Phone</label>
                    <input
                      id="phone"
                      type="tel"
                      formControlName="phone"
                      class="form-input"
                      placeholder="+39 02 1234567"
                    >
                  </div>

                  <div>
                    <label for="website" class="form-label">Website</label>
                    <input
                      id="website"
                      type="url"
                      formControlName="website"
                      class="form-input"
                      placeholder="https://www.company.com"
                    >
                  </div>

                  <div>
                    <label for="industry" class="form-label">Industry</label>
                    <select id="industry" formControlName="industry" class="form-input">
                      <option value="">Select industry</option>
                      <option value="TECHNOLOGY">Technology</option>
                      <option value="MANUFACTURING">Manufacturing</option>
                      <option value="HEALTHCARE">Healthcare</option>
                      <option value="FINANCE">Finance</option>
                      <option value="RETAIL">Retail</option>
                      <option value="EDUCATION">Education</option>
                      <option value="CONSULTING">Consulting</option>
                      <option value="ENERGY">Energy</option>
                      <option value="TRANSPORTATION">Transportation</option>
                      <option value="AGRICULTURE">Agriculture</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label for="businessSize" class="form-label">Business Size</label>
                    <select id="businessSize" formControlName="businessSize" class="form-input">
                      <option value="">Select business size</option>
                      <option value="STARTUP">Startup (1-10 employees)</option>
                      <option value="SMALL">Small (11-50 employees)</option>
                      <option value="MEDIUM">Medium (51-250 employees)</option>
                      <option value="LARGE">Large (251-1000 employees)</option>
                      <option value="ENTERPRISE">Enterprise (1000+ employees)</option>
                    </select>
                  </div>
                </div>

                <!-- Address Information -->
                <div class="mt-6">
                  <h5 class="text-md font-medium text-gray-900 mb-4">Address Information</h5>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label for="country" class="form-label">Country</label>
                      <select id="country" formControlName="country" class="form-input">
                        <option value="">Select country</option>
                        <option value="IT">Italy</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="ES">Spain</option>
                        <option value="UK">United Kingdom</option>
                        <option value="US">United States</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label for="region" class="form-label">Region/State</label>
                      <input
                        id="region"
                        type="text"
                        formControlName="region"
                        class="form-input"
                        placeholder="Lombardy"
                      >
                    </div>

                    <div>
                      <label for="city" class="form-label">City</label>
                      <input
                        id="city"
                        type="text"
                        formControlName="city"
                        class="form-input"
                        placeholder="Milan"
                      >
                    </div>

                    <div>
                      <label for="postalCode" class="form-label">Postal Code</label>
                      <input
                        id="postalCode"
                        type="text"
                        formControlName="postalCode"
                        class="form-input"
                        placeholder="20100"
                      >
                    </div>

                    <div class="md:col-span-2">
                      <label for="address" class="form-label">Street Address</label>
                      <input
                        id="address"
                        type="text"
                        formControlName="address"
                        class="form-input"
                        placeholder="Via Roma, 123"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

           

            <!-- Step 2: User Account -->
            <div *ngIf="currentStep === 2" class="space-y-6">
              <!-- User Section Header -->
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div class="flex items-center">
                  <svg class="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <div>
                    <h3 class="text-lg font-medium text-green-900">User Account</h3>
                    <p class="text-sm text-green-700 mt-1">Create your personal access credentials</p>
                  </div>
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="username" class="form-label">Username *</label>
                  <input
                    id="username"
                    type="text"
                    formControlName="username"
                    class="form-input"
                    placeholder="e.g. andrea.rossi"
                    [class.border-red-500]="registrationForm.get('username')?.invalid && registrationForm.get('username')?.touched"
                  >
                  <div *ngIf="registrationForm.get('username')?.invalid && registrationForm.get('username')?.touched" 
                       class="mt-1 text-sm text-red-600">
                    <p *ngIf="registrationForm.get('username')?.errors?.['required']">Username is required</p>
                    <p *ngIf="registrationForm.get('username')?.errors?.['minlength']">Minimum 3 characters</p>
                    <p *ngIf="registrationForm.get('username')?.errors?.['pattern']">Only lowercase letters, numbers and dots</p>
                  </div>
                </div>

                <div>
                  <label for="password" class="form-label">Password *</label>
                  <input
                    id="password"
                    type="password"
                    formControlName="password"
                    class="form-input"
                    placeholder="Secure password"
                    [class.border-red-500]="registrationForm.get('password')?.invalid && registrationForm.get('password')?.touched"
                  >
                  <div *ngIf="registrationForm.get('password')?.invalid && registrationForm.get('password')?.touched" 
                       class="mt-1 text-sm text-red-600">
                    <p *ngIf="registrationForm.get('password')?.errors?.['required']">Password is required</p>
                    <p *ngIf="registrationForm.get('password')?.errors?.['minlength']">Minimum 8 characters</p>
                  </div>
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="firstName" class="form-label">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    formControlName="firstName"
                    class="form-input"
                    placeholder="Your first name"
                  >
                </div>

                <div>
                  <label for="lastName" class="form-label">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    formControlName="lastName"
                    class="form-input"
                    placeholder="Your last name"
                  >
                  </div>
                </div>

              <div>
                <label for="userEmail" class="form-label">Email Address</label>
                <input
                  id="userEmail"
                  type="email"
                  formControlName="userEmail"
                  class="form-input"
                  placeholder="your.email@company.com"
                >
              </div>

              <div>
                <label for="userPhone" class="form-label">Phone Number</label>
                <input
                  id="userPhone"
                  type="tel"
                  formControlName="userPhone"
                  class="form-input"
                  placeholder="+39 123 456 7890"
                >
              </div>

              <div>
                <label for="role" class="form-label">User Role *</label>
                <select
                  id="role"
                  formControlName="role"
                    class="form-input"
                  [class.border-red-500]="registrationForm.get('role')?.invalid && registrationForm.get('role')?.touched"
                >
                  <option value="ADMIN">Administrator</option>
                  </select>
                <div *ngIf="registrationForm.get('role')?.invalid && registrationForm.get('role')?.touched" 
                       class="mt-1 text-sm text-red-600">
                  <p *ngIf="registrationForm.get('role')?.errors?.['required']">User role is required</p>
                </div>
                <p class="mt-1 text-sm text-gray-500">Administrator has full access to company settings and data</p>
              </div>
            </div>

            <!-- Step 3: Confirmation -->
            <div *ngIf="currentStep === 3" class="space-y-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Registration Confirmation</h3>
              
              <!-- Company Information Summary -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h4 class="font-medium text-blue-900 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                  Company Information
                </h4>
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt class="font-medium text-blue-700">Company Name:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('participantName')?.value }}</dd>
                  </div>
                  <div>
                    <dt class="font-medium text-blue-700">Description:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('description')?.value }}</dd>
                  </div>
                  
                  <!-- Additional Company Details -->
                  <div *ngIf="registrationForm.get('companyType')?.value">
                    <dt class="font-medium text-blue-700">Company Type:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('companyType')?.value }}</dd>
                  </div>
                  <div *ngIf="registrationForm.get('vatNumber')?.value">
                    <dt class="font-medium text-blue-700">VAT Number:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('vatNumber')?.value }}</dd>
                  </div>
                  <div *ngIf="registrationForm.get('fiscalCode')?.value">
                    <dt class="font-medium text-blue-700">Fiscal Code:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('fiscalCode')?.value }}</dd>
                  </div>
                  <div *ngIf="registrationForm.get('email')?.value">
                    <dt class="font-medium text-blue-700">Company Email:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('email')?.value }}</dd>
                  </div>
                  <div *ngIf="registrationForm.get('phone')?.value">
                    <dt class="font-medium text-blue-700">Company Phone:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('phone')?.value }}</dd>
                  </div>
                  <div *ngIf="registrationForm.get('website')?.value">
                    <dt class="font-medium text-blue-700">Website:</dt>
                    <dd class="text-blue-900">
                      <a [href]="registrationForm.get('website')?.value" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
                        {{ registrationForm.get('website')?.value }}
                      </a>
                    </dd>
                  </div>
                  <div *ngIf="registrationForm.get('industry')?.value">
                    <dt class="font-medium text-blue-700">Industry:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('industry')?.value }}</dd>
                  </div>
                  <div *ngIf="registrationForm.get('businessSize')?.value">
                    <dt class="font-medium text-blue-700">Business Size:</dt>
                    <dd class="text-blue-900">{{ registrationForm.get('businessSize')?.value }}</dd>
                  </div>
                </dl>

                <!-- Address Information -->
                <div *ngIf="registrationForm.get('country')?.value || registrationForm.get('city')?.value || registrationForm.get('address')?.value" class="mt-4 pt-4 border-t border-blue-200">
                  <h5 class="font-medium text-blue-800 mb-3">Address Information</h5>
                  <dl class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div *ngIf="registrationForm.get('country')?.value">
                      <dt class="font-medium text-blue-700">Country:</dt>
                      <dd class="text-blue-900">{{ registrationForm.get('country')?.value }}</dd>
                    </div>
                    <div *ngIf="registrationForm.get('region')?.value">
                      <dt class="font-medium text-blue-700">Region/State:</dt>
                      <dd class="text-blue-900">{{ registrationForm.get('region')?.value }}</dd>
                    </div>
                    <div *ngIf="registrationForm.get('city')?.value">
                      <dt class="font-medium text-blue-700">City:</dt>
                      <dd class="text-blue-900">{{ registrationForm.get('city')?.value }}</dd>
                    </div>
                    <div *ngIf="registrationForm.get('postalCode')?.value">
                      <dt class="font-medium text-blue-700">Postal Code:</dt>
                      <dd class="text-blue-900">{{ registrationForm.get('postalCode')?.value }}</dd>
                    </div>
                    <div *ngIf="registrationForm.get('address')?.value" class="md:col-span-2">
                      <dt class="font-medium text-blue-700">Street Address:</dt>
                      <dd class="text-blue-900">{{ registrationForm.get('address')?.value }}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <!-- User Information Summary -->
              <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h4 class="font-medium text-green-900 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  User Account
                </h4>
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt class="font-medium text-green-700">Username:</dt>
                    <dd class="text-green-900">{{ registrationForm.get('username')?.value }}</dd>
                  </div>
                  <div>
                    <dt class="font-medium text-green-700">Name:</dt>
                    <dd class="text-green-900">{{ registrationForm.get('firstName')?.value }} {{ registrationForm.get('lastName')?.value }}</dd>
                  </div>
                  <div>
                    <dt class="font-medium text-green-700">Email:</dt>
                    <dd class="text-green-900">{{ registrationForm.get('userEmail')?.value }}</dd>
                  </div>
                  <div *ngIf="registrationForm.get('userPhone')?.value">
                    <dt class="font-medium text-green-700">Phone:</dt>
                    <dd class="text-green-900">{{ registrationForm.get('userPhone')?.value }}</dd>
                  </div>
                  <div>
                    <dt class="font-medium text-green-700">Role:</dt>
                    <dd class="text-green-900">{{ getRoleLabel(registrationForm.get('role')?.value) }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Terms and Conditions -->
              <div class="space-y-4">
                <div class="flex items-start">
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    formControlName="termsAccepted"
                    class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  >
                  <label for="termsAccepted" class="ml-2 text-sm text-gray-700">
                    I accept the <a href="#" class="text-primary-600 hover:text-primary-500">Terms and Conditions</a> *
                  </label>
                </div>

                <div class="flex items-start">
                  <input
                    id="privacyAccepted"
                    type="checkbox"
                    formControlName="privacyAccepted"
                    class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  >
                  <label for="privacyAccepted" class="ml-2 text-sm text-gray-700">
                    I accept the <a href="#" class="text-primary-600 hover:text-primary-500">Privacy Policy</a> *
                  </label>
                </div>

                <div class="flex items-start">
                  <input
                    id="marketingAccepted"
                    type="checkbox"
                    formControlName="marketingAccepted"
                    class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  >
                  <label for="marketingAccepted" class="ml-2 text-sm text-gray-700">
                    I want to receive marketing communications (optional)
                  </label>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage" class="bg-red-50 border border-red-200 rounded-md p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">Registration error</h3>
                  <div class="mt-2 text-sm text-red-700">
                    <p>{{ errorMessage }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Success Message -->
            <div *ngIf="successMessage" class="bg-green-50 border border-green-200 rounded-md p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-green-800">Registration completed!</h3>
                  <div class="mt-2 text-sm text-green-700">
                    <p>{{ successMessage }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Navigation Buttons -->
            <div class="flex justify-between pt-6">
              <button
                type="button"
                *ngIf="currentStep > 1"
                (click)="previousStep()"
                class="btn-secondary"
              >
                Previous
              </button>
              <div *ngIf="currentStep === 1" class="w-full"></div>
              
              <button
                type="button"
                *ngIf="currentStep < 3"
                (click)="nextStep()"
                class="btn-primary"
                [disabled]="!canProceedToNextStep()"
              >
                Next
              </button>
              
              <button
                type="submit"
                *ngIf="currentStep === 3"
                class="btn-primary"
                [disabled]="!registrationForm.valid || isLoading"
              >
                <span *ngIf="!isLoading">Complete Registration</span>
                <span *ngIf="isLoading" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registration in progress...
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-label {
      @apply block text-sm font-medium text-gray-700 mb-2;
    }
    
    .form-input {
      @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
    }
    
    .btn-primary {
      @apply inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed;
    }
    
    .btn-secondary {
      @apply inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500;
    }
  `]
})
export class RegistrationComponent implements OnInit {
  registrationForm: FormGroup;
  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  configService = inject(ConfigService);
  private authService = inject(AuthService);

  constructor(
    private fb: FormBuilder,
    private participantService: ParticipantService,
    private router: Router
  ) {
    this.registrationForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.configService.config?.features?.enableDevMode) {
      this.prepopulateForm();
    }
  }

  private prepopulateForm(): void {

    this.registrationForm.patchValue({
      participantName: 'Tech Solutions SRL',
      description: 'Technology company specializing in data solutions and digital transformation',
      companyType: 'SRL',
      vatNumber: 'IT12345678901',
      fiscalCode: 'TSTCMP80A01H501U',
      email: 'info@techsolutions.it',
      phone: '+39 02 1234567',
      website: 'https://www.techsolutions.it',
      industry: 'TECHNOLOGY',
      country: 'IT',
      region: 'Lombardy',
      city: 'Milan',
      address: 'Via Test, 123',
      postalCode: '20100',
      businessSize: 'MEDIUM',
      username: 'andrea.rossi',
      password: 'TestPassword123!',
      firstName: 'Andrea',
      lastName: 'Rossi',
      userEmail: 'andrea.rossi@techsolutions.it',
      userPhone: '+39 123 456 7890',
      role: 'ADMIN',
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      participantName: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      description: ['', [
        Validators.required,
        Validators.minLength(10)
      ]],
      companyType: [''],
      vatNumber: [''],
      fiscalCode: [''],
      email: ['', [Validators.email]],
      phone: [''],
      website: [''],
      industry: [''],
      country: [''],
      region: [''],
      city: [''],
      address: [''],
      postalCode: [''],
      businessSize: [''],
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[a-z0-9.]+$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
      firstName: [''],
      lastName: [''],
      userEmail: ['', [Validators.email]],
      userPhone: [''],
      role: ['ADMIN', [Validators.required]],

      termsAccepted: [false, [Validators.requiredTrue]],
      privacyAccepted: [false, [Validators.requiredTrue]],
      marketingAccepted: [false]
    });
  }

  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.currentStep++;
      this.errorMessage = '';
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
    }
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!(this.registrationForm.get('participantName')?.valid &&
          this.registrationForm.get('description')?.valid);
      case 2:
        return !!(this.registrationForm.get('username')?.valid &&
          this.registrationForm.get('password')?.valid);
      case 3:
        return this.registrationForm.valid;
      default:
        return false;
    }
  }

  onSubmit(): void {
    this.registrationForm.markAllAsTouched();

    if (this.registrationForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formValue = this.registrationForm.value;

      const registrationRequest: ParticipantRegistrationRequest = {
        participant: {
          name: formValue.participantName,
          description: formValue.description,
          metadata: {
            companyName: formValue.participantName,
            companyType: formValue.companyType,
            vatNumber: formValue.vatNumber,
            fiscalCode: formValue.fiscalCode,
            email: formValue.email,
            phone: formValue.phone,
            website: formValue.website,
            industry: formValue.industry,
            country: formValue.country,
            region: formValue.region,
            city: formValue.city,
            address: formValue.address,
            postalCode: formValue.postalCode,
            businessSize: formValue.businessSize,
            termsAccepted: formValue.termsAccepted || false,
            privacyAccepted: formValue.privacyAccepted || false,
            marketingAccepted: formValue.marketingAccepted || false,
            registrationSource: 'B2C_PORTAL',
            environment: 'production'
          }
        },
        user: {
          username: formValue.username,
          password: formValue.password,
          metadata: {
            firstName: formValue.firstName,
            lastName: formValue.lastName,
            email: formValue.userEmail,
            phone: formValue.userPhone,
            role: formValue.role
          }
        }
      };

      this.participantService.registerParticipant(registrationRequest).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = `Registration completed successfully! Company "${response.participant?.name}" and user "${response.user?.username}" have been registered.`;

          this.router.navigate(['/success'], {
            queryParams: {
              participantId: response.participant?.id,
              participantName: response.participant?.name,
              username: response.user?.username
            }
          });
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Registration error:', error);

          if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = 'Registration failed. Please try again.';
          }
        }
      });
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      default:
        return role;
    }
  }
}