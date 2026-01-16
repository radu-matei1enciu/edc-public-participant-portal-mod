const http = require('http');
const url = require('url');

let participants = [
  {
    id: 'user-123',
    name: 'test-company-dev',
    description: 'Azienda di test per sviluppo',
    currentOperation: 'ACTIVE',
    metadata: {
      companyName: 'Test Company S.r.l.',
      companyType: 'SRL',
      vatNumber: '12345678901',
      fiscalCode: 'TSTCMP80A01H501U',
      email: 'test@testcompany.it',
      phone: '+39 02 1234567',
      website: 'https://www.testcompany.it',
      industry: 'TECHNOLOGY',
      country: 'IT',
      region: 'Lombardia',
      city: 'Milano',
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
      registrationSource: 'B2C_PORTAL',
      environment: 'production'
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    status: 'ACTIVE'
  }
];

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

async function handleParticipantRegistration(req, res) {
  try {
    const body = await parseBody(req);
    console.log('Received participant registration:', body);

    const { participant, user } = body;

    if (!participant || !user) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Missing required fields',
        message: 'Both participant and user objects are required'
      }));
      return;
    }

    if (!participant.name || !participant.description) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Missing participant fields',
        message: 'Participant name and description are required'
      }));
      return;
    }

    if (!user.username || !user.password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Missing user fields',
        message: 'User username and password are required'
      }));
      return;
    }

    const participantId = `participant_${Date.now()}`;
    const userId = `user_${Date.now()}`;
    const participantObj = {
      id: participantId,
      name: participant.name,
      description: participant.description,
      currentOperation: 'REGISTERED',
      metadata: {
        ...participant.metadata,
        registrationDate: new Date().toISOString(),
        status: 'PENDING_APPROVAL'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userObj = {
      id: userId,
      participantId: participantId,
      username: user.username,
      password: user.password,
      metadata: user.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    participants.push(participantObj);
    
    if (!global.users) {
      global.users = [];
    }
    global.users.push(userObj);

    console.log(`Created participant ${participantId} and user ${userId}`);

    setTimeout(() => {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        participant: participantObj,
        user: { ...userObj, password: undefined },
        message: 'Registration completed successfully'
      }));
    }, 1000);

  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

function handleGetParticipants(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(participants));
}

function handleGetParticipantById(req, res, id) {
  const participant = participants.find(p => p.id === id);

  if (participant) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(participant));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Participant not found' }));
  }
}

function handleGetMe(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Token di autenticazione richiesto' }));
    return;
  }

  const mockResponse = {
    user: {
      id: 'user-123',
      username: 'andrea.rossi',
      metadata: {
        firstName: 'Andrea',
        lastName: 'Rossi',
        email: 'andrea.rossi@techsolutions.it',
        phone: '+39 02 1234567',
        role: 'ADMIN'
      },
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    participant: {
      id: 123,
      name: 'Tech Solutions SRL',
      description: 'Technology company specializing in data solutions and digital transformation',
      currentOperation: 'ACTIVE',
      metadata: {
        companyName: 'Tech Solutions SRL',
        companyType: 'SRL',
        vatNumber: '12345678901',
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
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
        registrationSource: 'B2C_PORTAL',
        environment: 'production'
      },
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      did: 'did:web:dataspace.example.com:participant:tech-solutions-srl',
      host: 'https://dataspace.example.com/participant/tech-solutions-srl',
      status: 'ACTIVE'
    }
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(mockResponse));
}

function handleDeleteParticipant(req, res, id) {
  const index = participants.findIndex(p => p.id === id);
  if (index !== -1) {
    participants.splice(index, 1);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Participant deleted successfully' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Participant not found' }));
  }
}

let memberships = [
  {
    id: 'membership-1',
    ecosystemId: 'ecosystem-1',
    ecosystemName: 'Manufacturing DataSpace',
    status: 'active',
    joinedAt: '2024-01-10T10:00:00Z',
    credentials: [
      { id: 'cred-1', type: 'VC', status: 'issued', issuedAt: '2024-01-10T10:05:00Z' }
    ]
  },
  {
    id: 'membership-2',
    ecosystemId: 'ecosystem-2',
    ecosystemName: 'Healthcare DataSpace',
    status: 'active',
    joinedAt: '2024-01-12T14:30:00Z',
    credentials: [
      { id: 'cred-2', type: 'VC', status: 'issued', issuedAt: '2024-01-12T14:35:00Z' }
    ]
  },
  {
    id: 'membership-3',
    ecosystemId: 'ecosystem-3',
    ecosystemName: 'Energy DataSpace',
    status: 'pending',
    joinedAt: '2024-01-14T09:00:00Z',
    credentials: []
  }
];

let partners = [
  {
    id: 'partner-1',
    name: 'Acme Corporation',
    description: 'Leading manufacturer in industrial automation',
    companyIdentifier: 'ACME001',
    metadata: {
      industry: 'Manufacturing',
      country: 'IT',
      region: 'Lombardy'
    }
  },
  {
    id: 'partner-2',
    name: 'MedTech Solutions',
    description: 'Healthcare technology provider',
    companyIdentifier: 'MEDTECH001',
    metadata: {
      industry: 'Healthcare',
      country: 'IT',
      region: 'Lazio'
    }
  }
];

let files = [
  {
    id: 'file-1',
    name: 'production-data-2024.csv',
    description: 'Production data for Q1 2024',
    useCase: 'uc-manufacturing',
    useCaseLabel: 'Manufacturing Analytics',
    origin: 'owned',
    dataspace: 'Manufacturing DataSpace',
    uploadedAt: '2024-01-10T11:00:00Z',
    size: 1024000,
    type: 'text/csv'
  },
  {
    id: 'file-2',
    name: 'patient-records-sample.json',
    description: 'Sample patient records (anonymized)',
    useCase: 'uc-healthcare',
    useCaseLabel: 'Healthcare Research',
    origin: 'owned',
    dataspace: 'Healthcare DataSpace',
    uploadedAt: '2024-01-12T15:00:00Z',
    size: 512000,
    type: 'application/json'
  },
  {
    id: 'file-3',
    name: 'energy-consumption-report.pdf',
    description: 'Monthly energy consumption report',
    useCase: 'uc-energy',
    useCaseLabel: 'Energy Management',
    origin: 'remote',
    dataspace: 'Energy DataSpace',
    uploadedAt: '2024-01-13T10:00:00Z',
    size: 2048000,
    type: 'application/pdf',
    accessRestrictions: [
      { partnerId: 'partner-1', partnerName: 'Acme Corporation', policy: 'restricted' }
    ]
  }
];

let useCases = [
  { id: 'uc-manufacturing', name: 'manufacturing', label: 'Manufacturing Analytics', description: 'Analytics for manufacturing processes' },
  { id: 'uc-healthcare', name: 'healthcare', label: 'Healthcare Research', description: 'Research data for healthcare' },
  { id: 'uc-energy', name: 'energy', label: 'Energy Management', description: 'Energy consumption and management' },
  { id: 'uc-logistics', name: 'logistics', label: 'Logistics Optimization', description: 'Supply chain and logistics optimization' }
];

let dataspaces = [
  { id: 1, name: 'CatenaX DataSpace' },
  { id: 2, name: 'Gaia-X DataSpace' },
  { id: 3, name: 'IDSA DataSpace' },
  { id: 4, name: 'Manufacturing-X' }
];

let serviceProviders = [
  { id: 1, name: 'Default Service Provider' }
];

let tenants = [];

let ecosystems = [
  { id: 'ecosystem-1', name: 'Manufacturing DataSpace', description: 'DataSpace for manufacturing industry' },
  { id: 'ecosystem-2', name: 'Healthcare DataSpace', description: 'DataSpace for healthcare industry' },
  { id: 'ecosystem-3', name: 'Energy DataSpace', description: 'DataSpace for energy industry' }
];

function handleGetMemberships(req, res, participantId) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(memberships));
}

function handleGetMembershipDetails(req, res, participantId, membershipId) {
  const membership = memberships.find(m => m.id === membershipId);
  if (membership) {
    const ecosystem = ecosystems.find(e => e.id === membership.ecosystemId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...membership, ecosystem }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Membership not found' }));
  }
}

function handleGetEcosystems(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(ecosystems));
}

function handleGetDataspaces(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(dataspaces));
}

async function handleRegisterTenant(req, res, providerId) {
  try {
    const body = await parseBody(req);
    const tenantId = tenants.length + 1;
    
    const newTenant = {
      id: tenantId,
      providerId: parseInt(providerId),
      name: body.tenantName,
      participants: []
    };
    
    tenants.push(newTenant);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newTenant));
  } catch (error) {
    console.error('Error registering tenant:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}

async function handleCreateParticipant(req, res, providerId, tenantId) {
  try {
    const body = await parseBody(req);
    const participantId = participants.length + 1;
    
    const tenant = tenants.find(t => t.id === parseInt(tenantId) && t.providerId === parseInt(providerId));
    
    if (!tenant) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tenant not found' }));
      return;
    }
    
    const dataspaceInfos = body.dataspaceInfos || [];
    const dataspaceInfoList = dataspaceInfos.map((dsInfo, index) => ({
      dataspaceId: dsInfo.dataspaceId,
      agreementTypes: dsInfo.agreementTypes || [],
      roles: dsInfo.roles || [],
      id: index + 1
    }));
    
    const newParticipant = {
      id: participantId,
      identifier: body.identifier || `participant-${participantId}`,
      agents: [
        { id: 1, type: 'CONTROL_PLANE', state: 'PENDING' },
        { id: 2, type: 'CREDENTIAL_SERVICE', state: 'PENDING' },
        { id: 3, type: 'DATA_PLANE', state: 'PENDING' }
      ],
      dataspaceInfos: dataspaceInfoList
    };
    
    tenant.participants.push(newParticipant);
    participants.push(newParticipant);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newParticipant));
  } catch (error) {
    console.error('Error creating participant:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}

function handleGetTenant(req, res, providerId, tenantId) {
  const tenant = tenants.find(t => t.id === parseInt(tenantId) && t.providerId === parseInt(providerId));
  if (tenant) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tenant));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Tenant not found' }));
  }
}

function handleGetParticipant(req, res, providerId, tenantId, participantId) {
  const participant = participants.find(p => p.id === parseInt(participantId));
  if (participant) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(participant));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Participant not found' }));
  }
}

async function handleDeployParticipant(req, res, providerId, tenantId, participantId) {
  try {
    const body = await parseBody(req);
    const participant = participants.find(p => p.id === parseInt(participantId));
    if (participant) {
      participant.agents.forEach(agent => {
        if (agent.state === 'PENDING') {
          agent.state = 'ACTIVE';
        }
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(participant));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Participant not found' }));
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

function handleGetPartners(req, res, providerId, tenantId, participantId, dataspaceId) {
  const mockPartners = [
    { 
      identifier: 'partner-1', 
      nickname: 'Acme Corporation',
      id: 'partner-1',
      name: 'Acme Corporation',
      description: 'Leading manufacturer in industrial automation',
      companyIdentifier: 'ACME001',
      metadata: {
        industry: 'Manufacturing',
        country: 'IT',
        region: 'Lombardy'
      }
    },
    { 
      identifier: 'partner-2', 
      nickname: 'MedTech Solutions',
      id: 'partner-2',
      name: 'MedTech Solutions',
      description: 'Healthcare technology provider',
      companyIdentifier: 'MEDTECH001',
      metadata: {
        industry: 'Healthcare',
        country: 'IT',
        region: 'Lazio'
      }
    },
    { 
      identifier: 'partner-3', 
      nickname: 'TechCorp Industries',
      id: 'partner-3',
      name: 'TechCorp Industries',
      description: 'Technology solutions provider',
      companyIdentifier: 'TECHCORP001',
      metadata: {
        industry: 'Technology',
        country: 'IT',
        region: 'Tuscany'
      }
    },
    { 
      identifier: 'partner-4', 
      nickname: 'Global Solutions Ltd',
      id: 'partner-4',
      name: 'Global Solutions Ltd',
      description: 'Global business solutions',
      companyIdentifier: 'GLOBAL001',
      metadata: {
        industry: 'Consulting',
        country: 'IT',
        region: 'Lombardy'
      }
    }
  ];
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(mockPartners));
}

function handleGetPartner(req, res, providerId, tenantId, participantId, partnerId) {
  const mockPartners = [
    { 
      identifier: 'partner-1', 
      nickname: 'Acme Corporation',
      id: 'partner-1',
      name: 'Acme Corporation',
      description: 'Leading manufacturer in industrial automation',
      companyIdentifier: 'ACME001',
      metadata: {
        industry: 'Manufacturing',
        country: 'IT',
        region: 'Lombardy'
      }
    },
    { 
      identifier: 'partner-2', 
      nickname: 'MedTech Solutions',
      id: 'partner-2',
      name: 'MedTech Solutions',
      description: 'Healthcare technology provider',
      companyIdentifier: 'MEDTECH001',
      metadata: {
        industry: 'Healthcare',
        country: 'IT',
        region: 'Lazio'
      }
    }
  ];
  
  const partner = mockPartners.find(p => p.id === partnerId || p.identifier === partnerId);
  if (partner) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(partner));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Partner not found' }));
  }
}

function handleGetPartners(req, res, participantId) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(partners));
}

async function handleAddPartner(req, res, participantId) {
  try {
    const body = await parseBody(req);
    const newPartner = {
      id: `partner-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      companyIdentifier: body.companyIdentifier || '',
      metadata: body.metadata || {}
    };
    partners.push(newPartner);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newPartner));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

function handleGetPartner(req, res, participantId, partnerId) {
  const partner = partners.find(p => p.id === partnerId);
  if (partner) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(partner));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Partner not found' }));
  }
}

function handleGetFiles(req, res, participantId) {
  const query = url.parse(req.url, true).query;
  let filteredFiles = [...files];
  
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    filteredFiles = filteredFiles.filter(f => 
      f.name.toLowerCase().includes(searchLower) || 
      (f.description && f.description.toLowerCase().includes(searchLower))
    );
  }
  
  if (query.useCase) {
    filteredFiles = filteredFiles.filter(f => f.useCase === query.useCase);
  }
  
  if (query.origin) {
    filteredFiles = filteredFiles.filter(f => f.origin === query.origin);
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(filteredFiles));
}

function handleGetFileDetails(req, res, participantId, fileId) {
  const file = files.find(f => f.id === fileId);
  if (file) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(file));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
  }
}

async function handleUploadFile(req, res, participantId) {
  try {
    const body = await parseBody(req);
    const newFile = {
      id: `file-${Date.now()}`,
      name: body.name || 'uploaded-file',
      description: body.description || '',
      useCase: body.useCase || '',
      useCaseLabel: useCases.find(uc => uc.id === body.useCase)?.label || '',
      origin: 'owned',
      dataspace: body.dataspace || '',
      uploadedAt: new Date().toISOString(),
      size: body.size || 0,
      type: body.type || 'application/octet-stream'
    };
    files.push(newFile);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newFile));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

function handleGetUseCases(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(useCases));
}

function handleSearchFiles(req, res, participantId) {
  const query = url.parse(req.url, true).query;
  const searchTerm = query.q || query.search || '';
  const searchLower = searchTerm.toLowerCase();
  
  const results = files.filter(f => 
    f.name.toLowerCase().includes(searchLower) || 
    (f.description && f.description.toLowerCase().includes(searchLower)) ||
    (f.useCaseLabel && f.useCaseLabel.toLowerCase().includes(searchLower))
  );
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(results));
}

async function handleRequestAccess(req, res, participantId, fileId) {
  try {
    const body = await parseBody(req);
    const file = files.find(f => f.id === fileId);
    if (file) {
      if (!file.accessRestrictions) {
        file.accessRestrictions = [];
      }
      file.accessRestrictions.push({
        partnerId: body.partnerId || '',
        partnerName: body.partnerName || '',
        policy: body.policy || 'pending'
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Access request submitted', file }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}


const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  setCorsHeaders(res);

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (method === 'GET' && (path === '/api/ui/dataspaces' || path === '/v1/dataspaces')) {
    handleGetDataspaces(req, res);
  } else if (method === 'POST' && (path.match(/^\/api\/ui\/service-providers\/(\d+)\/tenants$/) || path.match(/^\/v1\/service-providers\/(\d+)\/tenants$/))) {
    const match = path.match(/\/(\d+)\/tenants$/);
    const providerId = match ? match[1] : path.split('/')[path.startsWith('/v1') ? 2 : 4];
    await handleRegisterTenant(req, res, providerId);
  } else if (method === 'POST' && (path.match(/^\/api\/ui\/service-providers\/(\d+)\/tenants\/(\d+)\/participants$/) || path.match(/^\/v1\/service-providers\/(\d+)\/tenants\/(\d+)\/participants$/))) {
    const match = path.match(/service-providers\/(\d+)\/tenants\/(\d+)\/participants$/);
    const providerId = match ? match[1] : (path.startsWith('/v1') ? path.split('/')[2] : path.split('/')[4]);
    const tenantId = match ? match[2] : (path.startsWith('/v1') ? path.split('/')[4] : path.split('/')[6]);
    await handleCreateParticipant(req, res, providerId, tenantId);
  } else if (method === 'GET' && (path.match(/^\/api\/ui\/service-providers\/(\d+)\/tenants\/(\d+)$/) || path.match(/^\/v1\/service-providers\/(\d+)\/tenants\/(\d+)$/))) {
    const parts = path.split('/');
    const providerId = parts[parts.length - 2];
    const tenantId = parts[parts.length - 1];
    handleGetTenant(req, res, providerId, tenantId);
  } else if (method === 'GET' && (path.match(/^\/api\/ui\/service-providers\/(\d+)\/tenants\/(\d+)\/participants\/(\d+)$/) || path.match(/^\/v1\/service-providers\/(\d+)\/tenants\/(\d+)\/participants\/(\d+)$/))) {
    const parts = path.split('/');
    const providerId = parts[parts.length - 3];
    const tenantId = parts[parts.length - 2];
    const participantId = parts[parts.length - 1];
    handleGetParticipant(req, res, providerId, tenantId, participantId);
  } else if (method === 'POST' && (path.match(/^\/api\/ui\/service-providers\/(\d+)\/tenants\/(\d+)\/participants\/(\d+)\/deployments$/) || path.match(/^\/v1\/service-providers\/(\d+)\/tenants\/(\d+)\/participants\/(\d+)\/deployments$/))) {
    const parts = path.split('/');
    const providerId = parts[parts.length - 4];
    const tenantId = parts[parts.length - 3];
    const participantId = parts[parts.length - 2];
    await handleDeployParticipant(req, res, providerId, tenantId, participantId);
  } else if (method === 'GET' && (path.match(/^\/api\/ui\/service-providers\/(\d+)\/tenants\/(\d+)\/participants\/(\d+)\/partners\/([^\/]+)$/) || path.match(/^\/v1\/service-providers\/(\d+)\/tenants\/(\d+)\/participants\/(\d+)\/partners\/([^\/]+)$/))) {
    const parts = path.split('/');
    const providerId = parts[parts.length - 5];
    const tenantId = parts[parts.length - 4];
    const participantId = parts[parts.length - 2];
    const lastParam = parts[parts.length - 1];
    
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const dataspaceId = parsedUrl.searchParams.get('dataspaceId');
    
    if (lastParam.match(/^partner-/)) {
      const partnerId = lastParam;
      handleGetPartner(req, res, providerId, tenantId, participantId, partnerId);
    } else if (dataspaceId) {
      handleGetPartners(req, res, providerId, tenantId, participantId, dataspaceId);
    } else if (lastParam.match(/^\d+$/)) {
      const dataspaceIdFromPath = lastParam;
      handleGetPartners(req, res, providerId, tenantId, participantId, dataspaceIdFromPath);
    } else {
      const partnerId = lastParam;
      handleGetPartner(req, res, providerId, tenantId, participantId, partnerId);
    }
  } else if (method === 'POST' && path.match(/^\/v1\/service-providers\/(\d+)\/tenants\/(\d+)\/participants$/)) {
    const parts = path.split('/');
    const providerId = parts[3];
    const tenantId = parts[5];
    await handleCreateParticipant(req, res, providerId, tenantId);
  }
  else if (method === 'POST' && path === '/v1/participants') {
    await handleParticipantRegistration(req, res);
  } else if (method === 'GET' && path === '/v1/participants') {
    handleGetParticipants(req, res);
  } else if (method === 'GET' && (path === '/v1/participants/me' || path === '/api/ui/participants/me' || path === '/v1/me')) {
    handleGetMe(req, res);
  } else if (method === 'GET' && path.startsWith('/v1/participants/') && !path.includes('/memberships') && !path.includes('/partners') && !path.includes('/files') && path !== '/v1/participants/me') {
    const id = path.split('/')[3];
    handleGetParticipantById(req, res, id);
  } else if (method === 'DELETE' && path.startsWith('/v1/participants/') && !path.includes('/memberships') && !path.includes('/partners') && !path.includes('/files')) {
    const id = path.split('/')[3];
    handleDeleteParticipant(req, res, id);
  } 
  // Memberships routes
  else if (method === 'GET' && (path.match(/^\/v1\/participants\/([^\/]+)\/memberships$/) || path.match(/^\/api\/ui\/participants\/([^\/]+)\/memberships$/))) {
    const parts = path.split('/');
    const participantId = path.startsWith('/api/ui') ? parts[4] : parts[3];
    handleGetMemberships(req, res, participantId);
  } else if (method === 'GET' && (path.match(/^\/v1\/participants\/([^\/]+)\/memberships\/([^\/]+)$/) || path.match(/^\/api\/ui\/participants\/([^\/]+)\/memberships\/([^\/]+)$/))) {
    const parts = path.split('/');
    const participantId = path.startsWith('/api/ui') ? parts[4] : parts[3];
    const membershipId = path.startsWith('/api/ui') ? parts[6] : parts[5];
    handleGetMembershipDetails(req, res, participantId, membershipId);
  } else if (method === 'GET' && path === '/v1/ecosystems') {
    handleGetEcosystems(req, res);
  } else if (method === 'GET' && path === '/v1/dataspaces') {
    handleGetDataspaces(req, res);
  }
  // Partners routes
  else if (method === 'GET' && path.match(/^\/v1\/participants\/([^\/]+)\/partners$/)) {
    const participantId = path.split('/')[3];
    handleGetPartners(req, res, participantId);
  } else if (method === 'POST' && path.match(/^\/v1\/participants\/([^\/]+)\/partners$/)) {
    const participantId = path.split('/')[3];
    await handleAddPartner(req, res, participantId);
  } else if (method === 'GET' && path.match(/^\/v1\/participants\/([^\/]+)\/partners\/([^\/]+)$/)) {
    const parts = path.split('/');
    const participantId = parts[3];
    const partnerId = parts[5];
    handleGetPartner(req, res, participantId, partnerId);
  }
  // Files routes
  else if (method === 'GET' && (path.match(/^\/v1\/participants\/([^\/]+)\/files$/) || path.match(/^\/api\/ui\/participants\/([^\/]+)\/files$/))) {
    const parts = path.split('/');
    const participantId = path.startsWith('/api/ui') ? parts[4] : parts[3];
    handleGetFiles(req, res, participantId);
  } else if (method === 'GET' && (path.match(/^\/v1\/participants\/([^\/]+)\/files\/([^\/]+)$/) || path.match(/^\/api\/ui\/participants\/([^\/]+)\/files\/([^\/]+)$/))) {
    const parts = path.split('/');
    const participantId = path.startsWith('/api/ui') ? parts[4] : parts[3];
    const fileId = path.startsWith('/api/ui') ? parts[6] : parts[5];
    handleGetFileDetails(req, res, participantId, fileId);
  } else if (method === 'POST' && (path.match(/^\/v1\/participants\/([^\/]+)\/files$/) || path.match(/^\/api\/ui\/participants\/([^\/]+)\/files$/))) {
    const parts = path.split('/');
    const participantId = path.startsWith('/api/ui') ? parts[4] : parts[3];
    await handleUploadFile(req, res, participantId);
  } else if (method === 'GET' && (path === '/v1/use-cases' || path === '/api/ui/use-cases')) {
    handleGetUseCases(req, res);
  } else if (method === 'GET' && (path.match(/^\/v1\/participants\/([^\/]+)\/files\/search$/) || path.match(/^\/api\/ui\/participants\/([^\/]+)\/files\/search$/))) {
    const parts = path.split('/');
    const participantId = path.startsWith('/api/ui') ? parts[4] : parts[3];
    handleSearchFiles(req, res, participantId);
  } else if (method === 'POST' && (path.match(/^\/v1\/participants\/([^\/]+)\/files\/([^\/]+)\/request-access$/) || path.match(/^\/api\/ui\/participants\/([^\/]+)\/files\/([^\/]+)\/request-access$/))) {
    const parts = path.split('/');
    const participantId = path.startsWith('/api/ui') ? parts[4] : parts[3];
    const fileId = path.startsWith('/api/ui') ? parts[6] : parts[5];
    await handleRequestAccess(req, res, participantId, fileId);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: path }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Mock server is running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  POST /v1/participants - Register new participant`);
  console.log(`  GET  /v1/participants - List participants`);
  console.log(`  GET  /api/ui/dataspaces or /v1/dataspaces - List dataspaces`);
  console.log(`  POST /api/ui/service-providers/:providerId/tenants or /v1/service-providers/:providerId/tenants - Register tenant`);
  console.log(`  POST /api/ui/service-providers/:providerId/tenants/:tenantId/participants or /v1/service-providers/:providerId/tenants/:tenantId/participants - Create participant`);
  console.log(`  GET  /api/ui/service-providers/:providerId/tenants/:tenantId or /v1/service-providers/:providerId/tenants/:tenantId - Get tenant`);
  console.log(`  GET  /api/ui/service-providers/:providerId/tenants/:tenantId/participants/participantId or /v1/service-providers/:providerId/tenants/:tenantId/participants/participantId - Get participant`);
  console.log(`  POST /api/ui/service-providers/:providerId/tenants/:tenantId/participants/:participantId/deployments or /v1/service-providers/:providerId/tenants/:tenantId/participants/:participantId/deployments - Deploy participant`);
  console.log(`  GET  /api/ui/service-providers/:providerId/tenants/:tenantId/participants/participantId/partners/:dataspaceId or /v1/service-providers/:providerId/tenants/:tenantId/participants/participantId/partners/:dataspaceId - Get partners`);
  console.log(`  GET  /v1/participants/:id - Get participant by ID`);
  console.log(`  DELETE /v1/participants/:id - Delete participant`);
  console.log(`  GET  /v1/me - Get current user profile (requires Bearer token)`);
  console.log(`  GET  /v1/participants/:id/memberships - List memberships`);
  console.log(`  GET  /v1/participants/:id/memberships/:membershipId - Get membership details`);
  console.log(`  GET  /v1/ecosystems - List ecosystems`);
  console.log(`  GET  /v1/dataspaces - List dataspaces`);
  console.log(`  GET  /v1/participants/:id/files - List files`);
  console.log(`  GET  /v1/participants/:id/files/:fileId - Get file details`);
  console.log(`  POST /v1/participants/:id/files - Upload file`);
  console.log(`  GET  /v1/use-cases - List use cases`);
  console.log(`  GET  /v1/participants/:id/files/search - Search files`);
  console.log(`  POST /v1/participants/:id/files/:fileId/request-access - Request file access`);
});
