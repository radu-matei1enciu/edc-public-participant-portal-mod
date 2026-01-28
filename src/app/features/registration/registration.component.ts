import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ParticipantService } from '../../core/services/participant.service';
import { TenantService } from '../../core/services/tenant.service';
import { DataspaceService } from '../../core/services/dataspace.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ModalService } from '../../core/services/modal.service';
import { ParticipantRegistrationRequest, ParticipantMetadata, UserMetadata, UploadedDocument } from '../../core/models/participant.model';
import { DataspaceResource } from '../../core/models/dataspace.model';
import { NewTenantRegistration, NewDataspaceInfo, TenantResource, ParticipantResource, NewParticipantDeployment } from '../../core/models/tenant.model';
import { ConfigService } from '../../core/services/config.service';
import { AuthService } from '../../core/services/auth.service';
import { formatFileSize, normalizeTenantNameForDns } from '../../shared/utils/format.utils';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss']
})
export class RegistrationComponent implements OnInit, AfterViewInit {
  formatFileSize = formatFileSize;
  
  @ViewChild('stepperContainer', { static: false }) stepperContainer!: ElementRef<HTMLDivElement>;
  
  registrationForm: FormGroup;
  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  configService = inject(ConfigService);
  private authService = inject(AuthService);
  private dataspaceService = inject(DataspaceService);
  private tenantService = inject(TenantService);
  private participantService = inject(ParticipantService);
  private notificationService = inject(NotificationService);
  private modalService = inject(ModalService);

  dataspaces: DataspaceResource[] = [];
  filteredDataspaces: DataspaceResource[] = [];
  dataspaceSearchControl = new FormControl('');
  selectedDataspace: DataspaceResource | null = null;

  uploadedDocuments: UploadedDocument[] = [];

  canScrollLeft = false;
  canScrollRight = false;

  steps = [
    { label: 'Select DataSpace', number: 1 },
    { label: 'Identifier', number: 2 },
    { label: 'Company Data', number: 3 },
    { label: 'Documents', number: 4 },
    { label: 'Terms', number: 5 },
    { label: 'Summary', number: 6 }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.registrationForm = this.createForm();
    this.initializeDataspaces();
  }

  ngOnInit(): void {
    this.registrationForm.get('dataspaceId')?.valueChanges.subscribe(dataspaceId => {
      this.selectedDataspace = this.dataspaces.find(ds => ds.id.toString() === dataspaceId) || null;
    });

    this.dataspaceSearchControl.valueChanges.subscribe(() => {
      this.filterDataspaces();
    });
  }

  ngAfterViewInit(): void {
    this.updateScrollButtons();
    window.addEventListener('resize', () => this.updateScrollButtons());
  }

  onStepperScroll(): void {
    this.updateScrollButtons();
  }

  updateScrollButtons(): void {
    if (!this.stepperContainer?.nativeElement) {
      return;
    }
    
    const container = this.stepperContainer.nativeElement;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    this.canScrollLeft = scrollLeft > 0;
    this.canScrollRight = scrollLeft < scrollWidth - clientWidth - 1;
  }

  scrollStepper(direction: 'left' | 'right'): void {
    if (!this.stepperContainer?.nativeElement) {
      return;
    }
    
    const container = this.stepperContainer.nativeElement;
    const scrollAmount = 200;
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    
    setTimeout(() => this.updateScrollButtons(), 300);
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.steps.length) {
      if (step <= this.currentStep || this.canProceedToStep(step - 1)) {
        this.currentStep = step;
        this.scrollToActiveStep();
        this.errorMessage = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  scrollToActiveStep(): void {
    if (!this.stepperContainer?.nativeElement) {
      return;
    }
    
    setTimeout(() => {
      const container = this.stepperContainer.nativeElement;
      const stepElements = container.querySelectorAll('[data-step]');
      const activeStep = stepElements[this.currentStep - 1] as HTMLElement;
      
      if (activeStep) {
        const containerRect = container.getBoundingClientRect();
        const stepRect = activeStep.getBoundingClientRect();
        const scrollLeft = container.scrollLeft + (stepRect.left - containerRect.left) - (containerRect.width / 2) + (stepRect.width / 2);
        
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
      
      this.updateScrollButtons();
    }, 100);
  }

  canProceedToStep(stepIndex: number): boolean {
    for (let i = 0; i < stepIndex; i++) {
      if (!this.canProceedToNextStepForIndex(i + 1)) {
        return false;
      }
    }
    return true;
  }

  canProceedToNextStepForIndex(step: number): boolean {
    switch (step) {
      case 1:
        return !!this.registrationForm.get('dataspaceId')?.valid;
      case 2:
        return true;
      case 3:
        return !!(this.registrationForm.get('participantName')?.valid &&
          this.registrationForm.get('description')?.valid);
      case 4:
        return true;
      case 5:
        return !!this.registrationForm.get('termsAccepted')?.valid;
      default:
        return true;
    }
  }

  private initializeDataspaces(): void {
    this.dataspaceService.getDataspaces().subscribe({
      next: (dataspaces: DataspaceResource[]) => {
        if (!dataspaces || dataspaces.length === 0) {
          this.showErrorModalAndRedirect();
          return;
        }
        
        this.dataspaces = dataspaces;
        this.filteredDataspaces = [...this.dataspaces];
        
        const currentValue = this.registrationForm.get('dataspaceId')?.value;
        if (!currentValue || currentValue === '') {
          const defaultDataspace = this.getDefaultDataspace(dataspaces);
          this.selectedDataspace = defaultDataspace;
          this.registrationForm.patchValue({ dataspaceId: defaultDataspace.id.toString() });
        }
        
        if (this.configService.config?.features?.enableDevMode) {
          this.prepopulateForm();
        }
      },
      error: () => {
        this.showErrorModalAndRedirect();
      }
    });
  }

  private showErrorModalAndRedirect(): void {
    this.modalService.alert({
      title: 'Error',
      message: 'An error occurred while loading dataspaces. You will be redirected to the landing page.',
      confirmText: 'OK'
    }).then(() => {
      this.router.navigate(['/']);
    });
  }

  private getDefaultDataspace(dataspaces: DataspaceResource[]): DataspaceResource {
    const catenaXByName = dataspaces.find(ds => 
      ds.name?.toLowerCase().includes('catena')
    );
    if (catenaXByName) {
      return catenaXByName;
    }
    
    return dataspaces[0];
  }

  filterDataspaces(): void {
    const searchTerm = this.dataspaceSearchControl.value || '';
    if (!searchTerm.trim()) {
      this.filteredDataspaces = [...this.dataspaces];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredDataspaces = this.dataspaces.filter(ds =>
      ds.name.toLowerCase().includes(term)
    );
  }

  private createForm(): FormGroup {
    return this.fb.group({
      dataspaceId: ['', [Validators.required]],
      companyIdentifier: [''],
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
      country: [''],
      region: [''],
      city: [''],
      address: [''],
      postalCode: [''],
      termsAccepted: [false, [Validators.requiredTrue]]
    });
  }

  private prepopulateForm(): void {
    const defaultDataspace = this.getDefaultDataspace(this.dataspaces);
    this.registrationForm.patchValue({
      dataspaceId: defaultDataspace.id.toString(),
      participantName: 'Tech Solutions SRL',
      description: 'Technology company specializing in data solutions and digital transformation',
      companyType: 'SRL',
      vatNumber: 'IT12345678901',
      fiscalCode: 'TSTCMP80A01H501U',
      email: 'info@techsolutions.it',
      phone: '+39 02 1234567',
      website: 'https://www.techsolutions.it',
      country: 'IT',
      region: 'Lombardy',
      city: 'Milan',
      address: 'Via Test, 123',
      postalCode: '20100',
      termsAccepted: true
    });
    this.selectedDataspace = defaultDataspace;
  }

  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.currentStep++;
      this.errorMessage = '';
      this.scrollToActiveStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
      this.scrollToActiveStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.registrationForm.get('dataspaceId')?.valid;
      case 2:
        return true;
      case 3:
        return !!(this.registrationForm.get('participantName')?.valid &&
          this.registrationForm.get('description')?.valid);
      case 4:
        return true;
      case 5:
        return !!this.registrationForm.get('termsAccepted')?.valid;
      case 6:
        return this.registrationForm.valid;
      default:
        return false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const maxFileSize = this.configService.getNestedValue<number>('upload.maxFileSize') || 10 * 1024 * 1024;
      const allowedTypes = this.configService.getNestedValue<string[]>('upload.allowedFileTypes') || [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];

      Array.from(input.files).forEach(file => {
        if (file.size > maxFileSize) {
          const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
          const errorMsg = `The file "${file.name}" exceeds the maximum size of ${maxSizeMB}MB`;
          this.modalService.alert({
            title: 'Upload Error',
            message: errorMsg,
            confirmText: 'OK'
          });
          return;
        }

        if (!allowedTypes.includes(file.type)) {
          const errorMsg = `The file type "${file.name}" is not supported`;
          this.modalService.alert({
            title: 'Upload Error',
            message: errorMsg,
            confirmText: 'OK'
          });
          return;
        }

        const document: UploadedDocument = {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          file: file
        };

        this.uploadedDocuments.push(document);
        this.errorMessage = '';
      });
    }
  }

  removeDocument(index: number): void {
    this.uploadedDocuments.splice(index, 1);
  }


  cancelRegistration(): void {
    if (confirm('Are you sure you want to cancel the registration? All entered data will be lost.')) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    this.registrationForm.markAllAsTouched();

    if (this.registrationForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formValue = this.registrationForm.value;
      const providerId = this.configService.config?.defaultServiceProviderId || 1;
      const dataspaceId = parseInt(formValue.dataspaceId);
      
      if (!dataspaceId || isNaN(dataspaceId)) {
        this.errorMessage = 'Please select a valid dataspace';
        this.isLoading = false;
        return;
      }
      
      const propertyKeys = [
        'companyIdentifier', 'description', 'companyType', 'vatNumber', 'fiscalCode',
        'email', 'phone', 'website', 'country', 'region', 'city', 'address', 'postalCode'
      ];
      
      const properties: Record<string, unknown> = {};
      propertyKeys.forEach(key => {
        const value = formValue[key];
        if (value) {
          properties[key] = value;
        }
      });
      
      const tenantRegistration: NewTenantRegistration = {
        tenantName: formValue.participantName,
        dataspaceInfos: [
          {
            dataspaceId: dataspaceId,
            agreementTypes: [],
            roles: []
          }
        ],
        ...(Object.keys(properties).length > 0 && { properties })
      };

      this.tenantService.registerTenant(providerId, tenantRegistration).subscribe({
        next: (tenant: TenantResource) => {
          if (!tenant.participants || tenant.participants.length === 0) {
            this.isLoading = false;
            this.modalService.alert({
              title: 'Registration Error',
              message: 'Tenant created but no participant was found. Please contact support.',
              confirmText: 'OK'
            }).then(() => {
              this.router.navigate(['/']);
            });
            return;
          }

          const participant = tenant.participants[0];
          const identifierPrefix = this.configService.config?.participantIdentifierPrefix || '';
          const normalizedTenantName = normalizeTenantNameForDns(tenant.name);
          const fullIdentifier = identifierPrefix + normalizedTenantName;
          
          const deployment: NewParticipantDeployment = {
            participantId: participant.id,
            identifier: fullIdentifier
          };

          this.participantService.deployParticipant(
            providerId,
            tenant.id,
            participant.id,
            deployment
          ).subscribe({
            next: () => {
              this.isLoading = false;
              this.successMessage = `Registration completed successfully! The company "${tenant.name}" has been registered.`;
              this.router.navigate(['/success'], {
                queryParams: {
                  tenantId: tenant.id.toString(),
                  participantId: participant.id.toString(),
                  participantName: tenant.name
                }
              });
            },
            error: (deploymentError) => {
              this.isLoading = false;

              let errorMessage = 'Participant deployment failed. Please try again.';
              if (deploymentError.error?.message) {
                errorMessage = deploymentError.error.message;
              } else if (deploymentError.message) {
                errorMessage = deploymentError.message;
              }

              this.modalService.alert({
                title: 'Deployment Error',
                message: errorMessage,
                confirmText: 'OK'
              }).then(() => {
                this.router.navigate(['/']);
              });
            }
          });
        },
        error: (error) => {
          this.isLoading = false;

          let errorMessage = 'Registration failed. Please try again.';
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }

          this.modalService.alert({
            title: 'Registration Error',
            message: errorMessage,
            confirmText: 'OK'
          }).then(() => {
            this.router.navigate(['/']);
          });
        }
      });
    }
  }
}
