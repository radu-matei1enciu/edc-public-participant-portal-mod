# EDC Participant Portal

A self-service portal for companies to register and manage their participation in dataspace ecosystems built on Eclipse Dataspace Component (EDC). This portal provides a streamlined registration process, user dashboard, and credential management for organizations joining dataspace networks.

## Overview

This portal enables companies to register themselves as participants in an EDC-based dataspace. The registration process collects company information, creates tenant and participant records, and initiates the provisioning workflow. Once registered, users can access their dashboard to view their company details, manage credentials, and monitor their participation status.

The portal is built with Angular 20 and TailwindCSS. It uses a simulated authentication mechanism for demo purposes, where users select a participant from available tenants, and the selection is persisted in the browser's localStorage.

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- An EDC backend with participant registration and management API endpoints

## Quick Start

Clone the repository and install dependencies:

```bash
npm install
```

For local development with the included mock server:

```bash
npm run start:mock
```

This starts the mock API server on port 3001 and the Angular development server on port 4200. Open http://localhost:4200 in your browser.

To run only the Angular app (pointing to your own backend):

```bash
npm start
```

The app will be available at http://localhost:4200.

## Building for Production

```bash
npm run build
```

The production build will be in `dist/edc-public-participant-portal/browser`. You can serve this with any static file server or integrate it into your deployment pipeline.

For development with automatic rebuilds:

```bash
npm run watch
```

## API Requirements

This portal expects a REST API that follows the EDC participant registration pattern. The backend should provide these endpoints following the OpenAPI specification:

### Tenant and Participant Registration

- `GET /api/ui/service-providers/{serviceProviderId}/tenants` - List all tenants for a service provider
- `POST /api/ui/service-providers/{serviceProviderId}/tenants` - Register a new tenant (automatically creates a participant)
- `POST /api/ui/service-providers/{serviceProviderId}/tenants/{tenantId}/participants/{participantId}/deployments` - Deploy a participant

### Participant Management

- `GET /api/ui/service-providers/{serviceProviderId}/tenants/{tenantId}/participants/{participantId}` - Get participant details
- `GET /api/ui/dataspaces` - List available dataspaces

### Partners and Memberships

- `GET /api/ui/service-providers/{serviceProviderId}/tenants/{tenantId}/participants/{participantId}/partners/{dataspaceId}` - List partners for a dataspace
- `GET /api/ui/service-providers/{serviceProviderId}/tenants/{tenantId}/participants/{participantId}/memberships` - List memberships

### Files

- `GET /api/ui/participants/{participantId}/files` - List participant files
- `POST /api/ui/participants/{participantId}/files` - Upload files
- `GET /api/ui/participants/{participantId}/files/{fileId}` - Get file details

All API endpoints follow the pattern `/api/ui/service-providers/{serviceProviderId}/tenants/{tenantId}/participants/{participantId}/...` where:
- `serviceProviderId` is preconfigured in `config.json` as `defaultServiceProviderId`
- `tenantId` and `participantId` are obtained from the selected participant stored in localStorage

## Configuration

Configuration is managed through JSON files in `src/assets/config/`:

- `config.json` - Main configuration file loaded at runtime

Key configuration options:

- `apiUrl` - Base URL for your EDC backend API (e.g., `"http://localhost:3001/api/ui"`)
- `defaultServiceProviderId` - Preconfigured service provider ID used in all API requests (e.g., `1`)
- `participantIdentifierPrefix` - Prefix used to compose the `identifier` field in the POST deployment request. The full identifier is constructed as `{participantIdentifierPrefix}{tenantName}` (e.g., `"did:web:identityhub.edc-v.svc.cluster.local%3A7083:sample"`)
- `appName` - Application display name
- `auth.enableAuth` - Enable/disable authentication (currently always enabled for demo)
- `auth.tokenKey` - Key for storing auth token in localStorage (not used in simulated auth)
- `auth.roles` - Role definitions (kept for compatibility, not actively used)

### Development Configuration Example

```json
{
  "production": false,
  "apiUrl": "http://localhost:3001/api/ui",
  "defaultServiceProviderId": 1,
  "participantIdentifierPrefix": "did:web:identityhub.edc-v.svc.cluster.local%3A7083:",
  "appName": "EDC Participant Portal",
  "auth": {
    "enableAuth": true,
    "tokenKey": "auth_token",
    "roles": {
      "admin": "EDC_ADMIN",
      "participant": "EDC_USER_PARTICIPANT"
    }
  }
}
```

### Production Configuration Example

```json
{
  "production": true,
  "apiUrl": "https://api.production.com/api/ui",
  "defaultServiceProviderId": 1,
  "participantIdentifierPrefix": "did:web:identityhub.edc-v.svc.cluster.local%3A7083:",
  "appName": "EDC Participant Portal",
  "auth": {
    "enableAuth": true,
    "tokenKey": "auth_token",
    "roles": {
      "admin": "EDC_ADMIN",
      "participant": "EDC_USER_PARTICIPANT"
    }
  }
}
```

## Authentication

The portal uses a **simulated authentication mechanism** for demo purposes. This approach allows testing the application without requiring a full identity provider setup.

### How It Works

1. **Participant Selection**: When a user clicks "Login" or "Access Portal", they are redirected to the login page (`/login`).

2. **Tenant and Participant Listing**: The login page fetches all available tenants for the configured service provider using:
   ```
   GET /api/ui/service-providers/{serviceProviderId}/tenants
   ```
   This endpoint returns a list of tenants, each containing one or more participants.

3. **Participant Selection**: The user can search and select a participant from the list. The UI displays:
   - Tenant name
   - Participant identifier
   - A combined display name (e.g., "Company Name - participant-identifier")

4. **Local Storage Persistence**: Once a participant is selected and the user clicks "Login", the following information is saved in the browser's `localStorage`:
   ```typescript
   {
     tenantId: number,
     participantId: number,
     tenantName: string,
     participantIdentifier: string
   }
   ```
   This data is stored under the key `selected_participant`.

5. **API Request Context**: For all subsequent API requests, the frontend automatically includes:
   - `serviceProviderId` from `config.json` (`defaultServiceProviderId`)
   - `tenantId` from the selected participant in localStorage
   - `participantId` from the selected participant in localStorage

   These values are used to construct API endpoints following the pattern:
   ```
   /api/ui/service-providers/{serviceProviderId}/tenants/{tenantId}/participants/{participantId}/...
   ```

6. **Logout**: When the user logs out, the `selected_participant` entry is removed from localStorage, and the user is redirected to the landing page.

### Important Notes

- **Demo Only**: This authentication mechanism is intended for demonstration and development purposes only. In a production environment, you should replace it with a proper identity provider (e.g., Keycloak, OAuth2, SAML).

- **Browser-Only Persistence**: The authentication state is stored only in the browser's localStorage. This means:
  - The selection persists across page refreshes within the same browser
  - The selection is lost when the browser's localStorage is cleared
  - The selection is browser-specific (not shared across devices or browsers)

- **No Server-Side Validation**: The backend does not validate the authentication state. The frontend simply includes the `tenantId` and `participantId` in API requests. In production, you should implement proper authentication tokens and server-side validation.

### Example API Request Flow

1. User selects participant with:
   - `tenantId: 1`
   - `participantId: 5`
   - `serviceProviderId: 1` (from config)

2. Frontend makes API call to list memberships:
   ```
   GET /api/ui/service-providers/1/tenants/1/participants/5/memberships
   ```

3. Frontend makes API call to list partners for dataspace 2:
   ```
   GET /api/ui/service-providers/1/tenants/1/participants/5/partners/2
   ```

All API requests automatically include the correct IDs from the selected participant and configuration.

## Features

- **Self-Service Registration**: Multi-step registration form for company and dataspace selection
- **Participant Selection**: User-friendly interface to select from available tenants and participants
- **User Dashboard**: View company details, memberships, partners, and files
- **Credential Management**: Request and view company credentials
- **Account Settings**: Manage account information
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Project Structure

```
src/app/
├── core/                    # Core services, models, guards, interceptors
│   ├── services/            # Business logic services
│   │   ├── auth.service.ts  # Authentication service (simulated login)
│   │   ├── config.service.ts
│   │   ├── tenant.service.ts
│   │   ├── participant.service.ts
│   │   ├── dataspace.service.ts
│   │   ├── partner.service.ts
│   │   ├── membership.service.ts
│   │   └── file-asset.service.ts
│   ├── models/              # TypeScript interfaces and types
│   │   ├── auth.model.ts    # SelectedParticipant interface
│   │   ├── tenant.model.ts
│   │   ├── participant.model.ts
│   │   └── ...
│   ├── guards/              # Route guards
│   │   └── auth.guard.ts   # Checks for selected participant
│   ├── interceptors/        # HTTP interceptors
│   └── init/                # Initialization factories
├── features/                # Feature modules
│   ├── landing/             # Landing page
│   ├── registration/         # Participant registration
│   ├── login/               # Participant selection/login
│   ├── success/             # Registration success page
│   ├── dashboard/           # User dashboard
│   ├── settings/            # Account settings
│   ├── memberships/         # Memberships management
│   ├── partners/            # Partners management
│   ├── files/               # Files management
│   └── explore/             # Explore remote files
└── shared/                  # Shared components and utilities
    ├── components/           # Reusable components
    ├── services/            # Shared services
    └── utils/               # Utility functions
```

## Development

The project uses Angular 20 with standalone components. Services are provided at the root level for dependency injection. State management is handled through RxJS Observables and BehaviorSubjects.

The mock server (`mock-server/`) provides a simple JSON-based API for development and testing. It includes endpoints for tenant registration, participant management, and other EDC operations.

### Development Mode

When `enableDevMode` is enabled in the configuration, the registration form is pre-populated with sample data to speed up testing. This feature should be disabled in production.

## Testing

Run the test suite:

```bash
npm test
```

## Deployment

After building, the `dist/edc-public-participant-portal/browser` folder contains everything needed for deployment. You can:

- Serve it with nginx, Apache, or any static file server
- Deploy to cloud storage services (S3, Azure Blob, etc.)
- Integrate into containerized deployments (Docker, Kubernetes)

Make sure to configure the `apiUrl` and `defaultServiceProviderId` in your production config to point to your EDC backend. For containerized deployments, you may want to use environment-specific configuration files or environment variables.

### Docker

A Dockerfile is included for containerized deployments. Build and run the image:

```bash
# Build the Docker image
npm run docker:build
# Or manually:
docker build -t edc-participant-portal .

# Run the container (Basic Auth will be active)
npm run docker:run
# Or manually:
docker run -p 8080:80 edc-participant-portal
```

The application will be available at http://localhost:8080 with Basic Authentication enabled.

**Note**: The Basic Auth is only active when running through Docker/nginx. When using `ng serve` for development, Basic Auth is not applied.

### Nginx

An nginx configuration template is provided in `nginx/templates/nginx.conf.template`. This can be used with environment variable substitution for flexible deployment configurations.

#### Basic Authentication

The nginx configuration includes Basic Authentication to protect the application. The `.htpasswd` file is **generated during Docker build** using build arguments.

**For Local Development**:
- Default credentials: `admin` / `password`
- The Dockerfile uses default values if no build args are provided

**For Production (GitHub Actions Pipeline)**:

The Docker build uses GitHub Secrets to generate the `.htpasswd` file. Configure these secrets in your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `BASIC_AUTH_USER`: The username for Basic Auth
   - `BASIC_AUTH_PASS`: The password for Basic Auth

The GitHub Actions workflow will automatically pass these secrets as build arguments to the Docker build, ensuring secure credentials in production.

- Never commit `.htpasswd` to the repository (it's in `.gitignore`)
- The default `admin/password` credentials are only for local development

**Manual Build with Custom Credentials**:

If you need to build locally with custom credentials:
```bash
docker build \
  --build-arg BASIC_AUTH_USER=myuser \
  --build-arg BASIC_AUTH_PASS=mypassword \
  -t edc-participant-portal .
```


## License

Licensed under the Apache License, Version 2.0. See the LICENSE file for details.

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the project repository.
