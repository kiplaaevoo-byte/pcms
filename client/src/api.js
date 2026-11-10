export const API = 'http://localhost:5000'

// ---------- AUTH ----------
export const loginApi = async (email, password) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return res.json()
}

export const registerApi = async (form) => {
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  })
  return res.json()
}

export const registerAdmin = async () => {
  const res = await fetch(`${API}/api/auth/create-admin`, { method: 'POST' })
  return res.json()
}

// ---------- HELPERS ----------
export const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

// Generic fetch with token
export const apiGet = async (path, token) => {
  const res = await fetch(`${API}${path}`, { headers: { 'Authorization': `Bearer ${token}` } })
  return res.json()
}

export const apiPost = async (path, token, body) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body)
  })
  return res.json()
}

export const apiPut = async (path, token, body) => {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body)
  })
  return res.json()
}

export const apiDelete = async (path, token) => {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.json()
}
// ---------- CANDIDATE PROFILE ----------
export const updateCandidate = async (token, id, body) => {
  const res = await fetch(`${API}/api/candidates/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body)
  })
  return res.json()
}

export const getCandidates = async (token) => {
  return apiGet('/api/candidates', token)
}