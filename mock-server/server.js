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

    // Validate required fields
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

function handleGetParticipant(req, res, id) {
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
      id: 'participant-123',
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


  if (method === 'POST' && path === '/v1/participants') {
    await handleParticipantRegistration(req, res);
  } else if (method === 'GET' && path === '/v1/participants') {
    handleGetParticipants(req, res);
  }
  else if (method === 'GET' && path === '/v1/participants/me') {
    handleGetMe(req, res);
  }
  else if (method === 'GET' && path.startsWith('/v1/participants/')) {
    const id = path.split('/')[3];
    handleGetParticipant(req, res, id);
  } else if (method === 'DELETE' && path.startsWith('/v1/participants/')) {
    const id = path.split('/')[3];
    handleDeleteParticipant(req, res, id);
  } else if (method === 'GET' && path === '/v1/me') {
    handleGetMe(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Mock server is running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  POST /v1/participants - Register new participant (with optional credentials)`);
  console.log(`  GET  /v1/participants - List participants`);
  console.log(`  GET  /v1/participants/:id - Get participant by ID`);
  console.log(`  GET  /v1/me - Get current user profile (requires Bearer token)`);
});
