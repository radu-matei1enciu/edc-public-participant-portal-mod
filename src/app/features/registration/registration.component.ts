import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
    private route = inject(ActivatedRoute);

    dataspaces: DataspaceResource[] = [];
    filteredDataspaces: DataspaceResource[] = [];
    dataspaceSearchControl = new FormControl('');
    selectedDataspace: DataspaceResource | null = null;

    uploadedDocuments: UploadedDocument[] = [];

    canScrollLeft = false;
    canScrollRight = false;

    // Join mode — set when navigating from the memberships page
    isJoinMode = false;
    joinDataspaceId: number | null = null;
    joinCompanyName = '';

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
        // Detect join mode from query params
        this.route.queryParams.subscribe(params => {
            if (params['mode'] === 'join') {
                this.isJoinMode = true;
                this.joinDataspaceId = parseInt(params['dataspaceId']);
                this.joinCompanyName = params['companyName'] || '';
            }
        });

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

    // In join mode, steps 1 and 2 are locked — minimum step is 3
    isStepLocked(stepNumber: number): boolean {
        return this.isJoinMode && stepNumber <= 2;
    }

    goToStep(step: number): void {
        if (this.isJoinMode && step <= 2) return; // locked in join mode
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
            case 3: {
                const nameValid = this.isJoinMode
                    ? !!this.joinCompanyName
                    : !!this.registrationForm.get('participantName')?.valid;
                return !!(nameValid && this.registrationForm.get('description')?.valid);
            }
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

                // In join mode: pre-select the target dataspace, lock it, jump to step 3
                if (this.isJoinMode && this.joinDataspaceId) {
                    const targetDs = dataspaces.find(ds => ds.id === this.joinDataspaceId);
                    if (targetDs) {
                        this.selectedDataspace = targetDs;
                        this.registrationForm.patchValue({
                            dataspaceId: targetDs.id.toString(),
                            participantName: this.joinCompanyName
                        });
                        this.registrationForm.get('dataspaceId')?.disable();
                        this.registrationForm.get('participantName')?.disable();

                        // Pre-fill remaining fields from the existing tenant properties
                        const providerId = this.configService.config?.defaultServiceProviderId || 1;
                        const selected = this.authService.getSelectedParticipant();
                        if (selected) {
                            this.tenantService.getTenant(providerId, selected.tenantId).subscribe({
                                next: (tenant) => {
                                    const p = tenant.properties || {};
                                    this.registrationForm.patchValue({
                                        description:       p['description']       || '',
                                        companyType:       p['companyType']       || '',
                                        vatNumber:         p['vatNumber']         || '',
                                        fiscalCode:        p['fiscalCode']        || '',
                                        email:             p['email']             || '',
                                        phone:             p['phone']             || '',
                                        website:           p['website']           || '',
                                        country:           p['country']           || '',
                                        region:            p['region']            || '',
                                        city:              p['city']              || '',
                                        address:           p['address']           || '',
                                        postalCode:        p['postalCode']        || '',
                                        companyIdentifier: p['companyIdentifier'] || ''
                                    });
                                },
                                error: () => {} // non-fatal, form is still usable with empty fields
                            });
                        }

                        this.currentStep = 3;
                        return;
                    }
                }

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
        // In join mode, don't go below step 3
        const minStep = this.isJoinMode ? 3 : 1;
        if (this.currentStep > minStep) {
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
            case 3: {
                const nameValid = this.isJoinMode
                    ? !!this.joinCompanyName
                    : !!this.registrationForm.get('participantName')?.valid;
                return !!(nameValid && this.registrationForm.get('description')?.valid);
            }
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
            this.router.navigate(this.isJoinMode ? ['/memberships'] : ['/']);
        }
    }

    onSubmit(): void {
        // Re-enable disabled controls before validation so their values are included
        this.registrationForm.get('dataspaceId')?.enable();
        this.registrationForm.get('participantName')?.enable();

        this.registrationForm.markAllAsTouched();

        if (this.registrationForm.valid) {
            this.isLoading = true;
            this.errorMessage = '';
            this.successMessage = '';

            const formValue = this.registrationForm.value;
            const providerId = this.configService.config?.defaultServiceProviderId || 1;
            const dataspaceId = parseInt(formValue.dataspaceId);

            if (isNaN(dataspaceId)) {
                this.errorMessage = 'Please select a valid dataspace';
                this.isLoading = false;
                return;
            }

            // In join mode: add the existing participant to the new dataspace
            // and deploy it — do NOT create a new tenant
            if (this.isJoinMode) {
                const selected = this.authService.getSelectedParticipant();
                if (!selected) {
                    this.errorMessage = 'Could not determine current user.';
                    this.isLoading = false;
                    return;
                }

                this.dataspaceService.joinDataspace(
                    providerId,
                    selected.tenantId,
                    selected.participantId,
                    dataspaceId
                ).subscribe({
                    next: () => {
                        this.isLoading = false;
                        this.notificationService.showSuccess(
                            'Success',
                            `Successfully joined ${this.selectedDataspace?.name}.`
                        );
                        this.router.navigate(['/memberships']);
                    },
                    error: (err) => {
                        this.isLoading = false;
                        const msg = err?.error?.message || err?.message || 'Failed to join dataspace.';
                        this.modalService.alert({ title: 'Join Error', message: msg, confirmText: 'OK' });
                    }
                });
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

                            // In join mode, go back to memberships so the user sees both dataspaces
                            if (this.isJoinMode) {
                                this.notificationService.showSuccess(
                                    'Success',
                                    `Successfully joined ${this.selectedDataspace?.name}. Your new participant is being provisioned.`
                                );
                                this.router.navigate(['/memberships']);
                            } else {
                                this.router.navigate(['/success'], {
                                    queryParams: {
                                        tenantId: tenant.id.toString(),
                                        participantId: participant.id.toString(),
                                        participantName: tenant.name
                                    }
                                });
                            }
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