import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { UserProfile, CredentialResponse, CredentialRequest, CredentialDefinition } from '../../core/models/participant.model';
import { ParticipantService } from '../../core/services/participant.service';
import { NotificationService } from '../../shared/services/notification.service';
import { NotificationsComponent } from '../../shared/services/notifications.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NotificationsComponent],
  template: `
    <!-- Loading Spinner -->
    <div *ngIf="!isAuthenticated" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="flex flex-col items-center space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div class="text-center">
          <h2 class="text-lg font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div *ngIf="isAuthenticated" class="min-h-screen bg-gray-50" (click)="closeUserMenu()">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <!-- Logo -->
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <h1 class="text-2xl font-bold text-blue-900">DataSpace EDC</h1>
              </div>
            </div>

            <!-- User Menu -->
            <div class="relative" *ngIf="userProfile">
              <button 
                (click)="toggleUserMenu($event)"
                class="flex items-center space-x-3 bg-white rounded-lg border border-gray-200 px-4 py-2 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span class="text-white font-semibold text-sm">
                    {{ getInitials(getUserDisplayName()) }}
                  </span>
                </div>
                <div class="text-left">
                  <p class="text-sm font-medium text-gray-900">{{ getUserDisplayName() }}</p>
                  <p class="text-xs text-gray-500">{{ getUserEmail() }}</p>
                </div>
                
                <svg class="w-4 h-4 text-gray-400" [class.rotate-180]="userMenuOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <!-- Dropdown Menu -->
              <div 
                *ngIf="userMenuOpen"
                class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div class="px-4 py-3 border-b border-gray-100">
                  <p class="text-sm font-medium text-gray-900">{{ getUserDisplayName() }}</p>
                  <p class="text-xs text-gray-500">{{ getUserEmail() }}</p>
                </div>
                <div class="py-1">
                  <button 
                    (click)="goToSettings()"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span>Settings</span>
                  </button>
                  <button 
                    (click)="logout()"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Welcome Section -->
        <div class="mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Welcome, {{ getUserDisplayName() }}!</h2>
          <p class="text-lg text-gray-600">Here's your dashboard with user and company information</p>
        </div>


        <!-- Profile Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Basic Info Card -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Basic Information</h3>
            </div>
            <div class="space-y-3">
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                <p class="text-sm text-gray-900 mt-1">{{ getUserDisplayName() }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
                <p class="text-sm text-gray-900 mt-1 font-mono">{{ userProfile?.user?.username }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                <p class="text-sm text-gray-900 mt-1">{{ getUserEmail() }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
                <p class="text-sm text-gray-900 mt-1">{{ userProfile?.user?.metadata?.phone || 'N/A' }}</p>
              </div>
            </div>
          </div>

          <!-- Status Card -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Other</h3>
            </div>
            <div class="space-y-3">
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">User Role</label>
                <div class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <span class="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5"></span>
                    {{ userProfile?.user?.metadata?.role || 'USER' }}
                  </span>
                </div>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Created</label>
                <p class="text-sm text-gray-900 mt-1">{{ formatDate(userProfile?.user?.createdAt || '') }}</p>
              </div>
            </div>
          </div>

          <!-- Company Info Card -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Company</h3>
            </div>
            <div class="space-y-3">
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Name</label>
                <p class="text-sm text-gray-900 mt-1 font-semibold">{{ getCompanyName() }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Industry</label>
                <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.industry || 'N/A' }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Region</label>
                <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.region || 'N/A' }}</p>
              </div>
            </div>
          </div>

          <!-- DataSpace Connection Card -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">DataSpace</h3>
            </div>
            <div class="space-y-3">
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">DID</label>
                <p class="text-sm text-gray-900 mt-1 font-mono break-all">{{ userProfile?.participant?.did || 'N/A' }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Host</label>
                <p class="text-sm text-gray-900 mt-1 break-all">{{ userProfile?.participant?.host || 'N/A' }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                <div class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span class="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                    {{ userProfile?.participant?.currentOperation }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Info Section -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center space-x-3 mb-6">
            <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Additional Information</h3>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Description</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.description || 'No description available' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Type</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.companyType || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">VAT Number</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.vatNumber || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Fiscal Code</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.fiscalCode || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Email</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.email || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Phone</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.phone || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Website</label>
              <p class="text-sm text-gray-900 mt-1">
                <ng-container *ngIf="getCompanyWebsite(); else noWebsite">
                  <a [href]="getCompanyWebsite()!" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
                    {{ getCompanyWebsite()! }}
                  </a>
                </ng-container>
                <ng-template #noWebsite>
                  <span>N/A</span>
                </ng-template>
              </p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Industry</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.industry || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Size</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.businessSize || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Country</label>
              <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.country || 'N/A' }}</p>
            </div>
          </div>

          <!-- Address Information -->
          <div *ngIf="userProfile?.participant?.metadata?.region || userProfile?.participant?.metadata?.city || userProfile?.participant?.metadata?.address" class="mt-6 pt-6 border-t border-gray-200">
            <h4 class="text-sm font-medium text-gray-900 mb-4">Address Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div *ngIf="userProfile?.participant?.metadata?.region">
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Region/State</label>
                <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.region }}</p>
              </div>
              <div *ngIf="userProfile?.participant?.metadata?.city">
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">City</label>
                <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.city }}</p>
              </div>
              <div *ngIf="userProfile?.participant?.metadata?.postalCode">
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Postal Code</label>
                <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.postalCode }}</p>
              </div>
              <div *ngIf="userProfile?.participant?.metadata?.address" class="md:col-span-2">
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Street Address</label>
                <p class="text-sm text-gray-900 mt-1">{{ userProfile?.participant?.metadata?.address }}</p>
              </div>
            </div>
          </div>
        </div>


        <!-- Credentials Section -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Company Credentials</h3>
            </div>
            <button
              (click)="openRequestCredentialsModal()"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Request Company Credential
            </button>
          </div>

          <!-- Credentials Loading -->
          <div *ngIf="credentialsLoading" class="flex items-center justify-center py-12">
            <div class="flex flex-col items-center space-y-3">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div class="text-center">
                <p class="text-sm font-medium text-gray-900">Loading company credentials...</p>
                <p class="text-xs text-gray-500 mt-1">Please wait while we fetch your credential information</p>
              </div>
            </div>
          </div>

          <!-- Credentials Error -->
          <div *ngIf="credentialsError" class="bg-red-50 border border-red-200 rounded-md p-6">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <h3 class="text-sm font-medium text-red-800">Unable to Load Company Credentials</h3>
                <div class="mt-2 text-sm text-red-700">
                  <p>{{ credentialsError }}</p>
                </div>
                <div class="mt-4">
                  <button
                    (click)="loadCredentials()"
                    class="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Credentials List -->
          <div *ngIf="!credentialsLoading && !credentialsError" class="space-y-4">
            <div *ngIf="credentials.length === 0" class="text-center py-12">
              <svg class="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h3 class="mt-4 text-lg font-medium text-gray-900">No Company Credentials Yet</h3>
              <p class="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Your company hasn't requested any credentials yet. Company credentials are digital certificates that verify your company's identity and permissions in the data space.
              </p>
              <div class="mt-6">
                <button
                  (click)="openRequestCredentialsModal()"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Request Your First Company Credential
                </button>
              </div>
            </div>

            <div *ngFor="let credential of credentials" class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-900">{{ getCredentialTypeLabel(credential.credentialType || credential.type) }}</h4>
                  <p class="text-xs text-gray-500 mt-1">ID: {{ credential.id }}</p>
                  <p class="text-xs text-gray-500">Format: {{ credential.format }}</p>
                </div>
                <div class="flex items-center space-x-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {{ getCredentialStatusColor(credential.status) }}">
                    {{ credential.status }}
                  </span>
                  <div class="text-right">
                    <p class="text-xs text-gray-500">Created</p>
                    <p class="text-xs text-gray-900">{{ formatDate(credential.createdAt) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Request Credentials Modal -->
        <div *ngIf="showRequestCredentialsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" (click)="closeRequestCredentialsModal()">
          <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" (click)="$event.stopPropagation()">
            <div class="mt-3">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Request New Company Credential</h3>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Credential Type <span class="text-red-500">*</span>
                  </label>
                  <select 
                    #credentialTypeSelect
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    [class.border-red-300]="!credentialTypeSelect.value"
                  >
                    <option value="">Select credential type</option>
                    <option *ngFor="let type of credentialTypes" [value]="type.value">
                      {{ type.label }}
                    </option>
                  </select>
                  <p class="mt-1 text-xs text-gray-500">Choose the type of credential you need</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Definition <span class="text-red-500">*</span>
                  </label>
                  <select 
                    #credentialDefSelect
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    [class.border-red-300]="!credentialDefSelect.value"
                    [disabled]="!credentialTypeSelect.value"
                  >
                    <option value="">Select definition</option>
                    <option 
                      *ngFor="let def of credentialDefinitions" 
                      [value]="def.id"
                      [disabled]="credentialTypeSelect.value && def.type !== credentialTypeSelect.value"
                    >
                      {{ def.label }}
                    </option>
                  </select>
                  <p class="mt-1 text-xs text-gray-500">
                    <span *ngIf="!credentialTypeSelect.value">Select a credential type first</span>
                    <span *ngIf="credentialTypeSelect.value">Choose the specific definition for your credential</span>
                  </p>
                </div>
              </div>

              <div class="flex justify-end space-x-3 mt-6">
                <button
                  (click)="closeRequestCredentialsModal()"
                  class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  [disabled]="requestingCredentials"
                >
                  Cancel
                </button>
                <button
                  (click)="requestCredentials(credentialTypeSelect.value, credentialDefSelect.value)"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  [disabled]="!credentialTypeSelect.value || !credentialDefSelect.value || requestingCredentials"
                >
                  <span *ngIf="!requestingCredentials">Request Company Credential</span>
                  <span *ngIf="requestingCredentials" class="flex items-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Requesting Company Credential...
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Error Modal -->
    <div *ngIf="showErrorModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Connection Error
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    {{ errorModalMessage }}
                  </p>
                  <div class="mt-4 p-4 bg-red-50 rounded-md">
                    <div class="flex items-center">
                      <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">
                          Auto-disconnect in {{ disconnectCountdown }} seconds
                        </h3>
                        <div class="mt-2 text-sm text-red-700">
                          <p>You will be automatically logged out to protect your account security.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              (click)="logoutImmediately()"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Logout Now
            </button>
            <button
              type="button"
              (click)="closeErrorModal()"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Notifications -->
    <app-notifications></app-notifications>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  loading = true;
  error: string | null = null;
  userMenuOpen = false;
  isAuthenticated = false;
  
  // Credentials properties
  credentials: CredentialResponse[] = [];
  credentialsLoading = false;
  credentialsError: string | null = null;
  showRequestCredentialsModal = false;
  requestingCredentials = false;
  showErrorModal = false;
  errorModalMessage = '';
  disconnectCountdown = 0;
  countdownInterval: any = null;
  
  // Available credential types and definitions
  credentialTypes = [
    { value: 'MembershipCredential', label: 'Membership Credential' },
    { value: 'DataProcessorCredential', label: 'Data Processor Credential' }
  ];
  credentialDefinitions = [
    { id: 'membership-credential-def', type: 'MembershipCredential', label: 'Membership Credential Definition' },
    { id: 'dataprocessor-credential-def', type: 'DataProcessorCredential', label: 'Data Processor Credential Definition' }
  ];

  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private participantService = inject(ParticipantService);
  private notificationService = inject(NotificationService);

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Show loading until Keycloak verifies authentication
    const loggedIn = this.authService.isAuthenticated();
    this.isAuthenticated = loggedIn;
    
    if (!loggedIn) {
      this.authService.login();
      return;
    }
    
    if (!this.authService.hasValidRoles()) {
      this.router.navigate(['/role-error']);
      return;
    }
    
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  loadUserProfile(): void {
    this.loading = true;
    this.error = null;

    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.loading = false;
        this.loadCredentials();
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Failed to load user profile';
        
        const errorMessage = this.getErrorMessage(error);
        
        this.showDisconnectModal(
          'Your session has expired. You will be automatically disconnected.',
          10
        );
        
      }
    });
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.authService.logout();
  }

  logoutNow(): void {
    this.authService.logout();
  }

  showDisconnectModal(message: string, countdownSeconds: number = 10): void {
    this.showErrorModal = true;
    this.errorModalMessage = message;
    this.disconnectCountdown = countdownSeconds;
    
    this.countdownInterval = setInterval(() => {
      this.disconnectCountdown--;
      if (this.disconnectCountdown <= 0) {
        this.closeErrorModal();
        this.authService.logout();
      }
    }, 1000);
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorModalMessage = '';
    this.disconnectCountdown = 0;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  logoutImmediately(): void {
    this.closeErrorModal();
    this.authService.logout();
  }

  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getUserDisplayName(): string {
    if (!this.userProfile?.user) return '';
    const user = this.userProfile.user;
    const firstName = user.metadata?.firstName || '';
    const lastName = user.metadata?.lastName || '';
    return `${firstName} ${lastName}`.trim() || user.username;
  }

  getUserEmail(): string {
    if (!this.userProfile?.user) return '';
    return this.userProfile.user.metadata?.email || this.userProfile.user.username;
  }

  getCompanyName(): string {
    if (!this.userProfile?.participant) return '';
    return this.userProfile.participant.name;
  }

  getCompanyWebsite(): string | null {
    if (!this.userProfile?.participant?.metadata?.website) return null;
    return this.userProfile.participant.metadata.website;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  loadCredentials(): void {
    if (!this.userProfile?.participant?.id) return;
    
    this.credentialsLoading = true;
    this.credentialsError = null;

    this.participantService.getCredentials(this.userProfile.participant.id).subscribe({
      next: (credentials) => {
        this.credentials = credentials;
        this.credentialsLoading = false;
        
      },
      error: (error) => {
        this.credentialsLoading = false;
        this.credentialsError = 'Failed to load credentials';
        
        const errorMessage = this.getErrorMessage(error);
        
        
        this.notificationService.showError(
          'Failed to Load Company Credentials',
          errorMessage
        );
      }
    });
  }

  openRequestCredentialsModal(): void {
    this.showRequestCredentialsModal = true;
  }

  closeRequestCredentialsModal(): void {
    this.showRequestCredentialsModal = false;
  }

  requestCredentials(credentialType: string, credentialDefinition: string): void {
    if (!this.userProfile?.participant?.id) {
      this.notificationService.showError(
        'Invalid Request',
        'Unable to identify your participant account. Please refresh the page and try again.'
      );
      return;
    }

    if (!credentialType || !credentialDefinition) {
      this.notificationService.showWarning(
        'Missing Information',
        'Please select both credential type and definition before requesting.'
      );
      return;
    }

    this.requestingCredentials = true;
    
    const credentialRequest: CredentialRequest = {
      credentials: [{
        format: 'VC1_0_JWT',
        type: credentialType as 'MembershipCredential' | 'DataProcessorCredential',
        id: credentialDefinition
      }]
    };

    this.participantService.requestCredentials(this.userProfile.participant.id, credentialRequest).subscribe({
      next: (response) => {
        this.requestingCredentials = false;
        this.showRequestCredentialsModal = false;
        
        this.notificationService.showSuccess(
          'Company Credential Requested Successfully',
          `Your company's ${this.getCredentialTypeLabel(credentialType)} request has been submitted and is being processed.`
        );
        
        this.loadCredentials();
      },
      error: (error) => {
        this.requestingCredentials = false;
        
        const errorMessage = this.getErrorMessage(error);
        
        this.notificationService.showError(
          'Failed to Request Company Credential',
          errorMessage
        );
      }
    });
  }

  getCredentialStatusColor(status: string): string {
    switch (status) {
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ISSUED':
        return 'bg-green-100 text-green-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'REVOKED':
        return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getCredentialTypeLabel(type: string): string {
    if (!type) return 'Unknown Credential Type';
    const credentialType = this.credentialTypes.find(t => t.value === type);
    return credentialType ? credentialType.label : type;
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.status) {
      switch (error.status) {
        case 400:
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Authentication required. Please log in again.';
        case 403:
          return 'Access denied. You don\'t have permission to perform this action.';
        case 404:
          return 'Resource not found. Please refresh the page and try again.';
        case 409:
          return 'Conflict detected. The credential may already exist or be in progress.';
        case 422:
          return 'Invalid data provided. Please check your selections and try again.';
        case 500:
          return 'Server error. Please try again later or contact support if the problem persists.';
        case 503:
          return 'Service temporarily unavailable. Please try again in a few moments.';
        default:
          return `Request failed with status ${error.status}. Please try again.`;
      }
    }
    
    if (error?.name === 'TimeoutError') {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    if (error?.name === 'NetworkError') {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    // Default fallback
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
}