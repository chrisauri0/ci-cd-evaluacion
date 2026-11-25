/* Frontend sin framework: login + CRUD de productos y usuarios contra /api */
const $ = (id) => document.getElementById(id);
let token = localStorage.getItem('token');
let me = JSON.parse(localStorage.getItem('me') || 'null');

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') logout();
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(msg || 'Error ' + res.status);
  }
  return data;
}

function showError(id, msg) {
  const el = $(id);
  el.textContent = msg || '';
  el.hidden = !msg;
}

function td(text) {
  const cell = document.createElement('td');
  cell.textContent = text ?? '';
  return cell;
}

function button(label, testid, cls, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.dataset.testid = testid;
  if (cls) b.className = cls;
  b.addEventListener('click', onClick);
  return b;
}

/* ---------- Sesión ---------- */
function render() {
  const logged = Boolean(token);
  $('login-view').hidden = logged;
  $('app-view').hidden = !logged;
  if (logged) {
    $('user-label').textContent = `${me.name} (${me.role})`;
    const isAdmin = me.role === 'admin';
    $('tab-users').hidden = !isAdmin;
    $('product-form').hidden = !isAdmin;
    loadProducts();
  }
}

function logout() {
  token = null;
  me = null;
  localStorage.removeItem('token');
  localStorage.removeItem('me');
  render();
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('login-error', '');
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('email').value, password: $('password').value }),
    });
    token = data.accessToken;
    me = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('me', JSON.stringify(me));
    $('password').value = '';
    render();
  } catch (err) {
    showError('login-error', err.message);
  }
});

$('btn-logout').addEventListener('click', logout);

function selectTab(name) {
  $('products-view').hidden = name !== 'products';
  $('users-view').hidden = name !== 'users';
  $('tab-products').classList.toggle('active', name === 'products');
  $('tab-users').classList.toggle('active', name === 'users');
  if (name === 'users') loadUsers();
  else loadProducts();
}
$('tab-products').addEventListener('click', () => selectTab('products'));
$('tab-users').addEventListener('click', () => selectTab('users'));

/* ---------- Productos ---------- */
async function loadProducts() {
  try {
    const items = await api('/products');
    const body = $('products-body');
    body.replaceChildren();
    for (const p of items) {
      const tr = document.createElement('tr');
      tr.dataset.testid = 'product-row';
      tr.dataset.name = p.name;
      tr.append(td(p.id), td(p.name), td(p.description), td(Number(p.price).toFixed(2)), td(p.stock));
      const actions = document.createElement('td');
      if (me.role === 'admin') {
        const box = document.createElement('div');
        box.className = 'actions';
        box.append(
          button('Editar', 'product-edit', 'secondary', () => editProduct(p)),
          button('Eliminar', 'product-delete', 'danger', () => deleteProduct(p.id)),
        );
        actions.append(box);
      }
      tr.append(actions);
      body.append(tr);
    }
  } catch (err) {
    showError('product-error', err.message);
  }
}

function editProduct(p) {
  $('p-id').value = p.id;
  $('p-name').value = p.name;
  $('p-description').value = p.description ?? '';
  $('p-price').value = p.price;
  $('p-stock').value = p.stock;
}

function clearProduct() {
  $('product-form').reset();
  $('p-id').value = '';
  showError('product-error', '');
}

async function deleteProduct(id) {
  try {
    await api('/products/' + id, { method: 'DELETE' });
    loadProducts();
  } catch (err) {
    showError('product-error', err.message);
  }
}

$('p-cancel').addEventListener('click', clearProduct);
$('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('product-error', '');
  const id = $('p-id').value;
  const body = {
    name: $('p-name').value,
    description: $('p-description').value,
    price: Number($('p-price').value),
    stock: Number($('p-stock').value),
  };
  try {
    await api(id ? '/products/' + id : '/products', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    clearProduct();
    loadProducts();
  } catch (err) {
    showError('product-error', err.message);
  }
});

/* ---------- Usuarios ---------- */
async function loadUsers() {
  try {
    const items = await api('/users');
    const body = $('users-body');
    body.replaceChildren();
    for (const u of items) {
      const tr = document.createElement('tr');
      tr.dataset.testid = 'user-row';
      tr.dataset.email = u.email;
      tr.append(td(u.id), td(u.name), td(u.email), td(u.role));
      const actions = document.createElement('td');
      const box = document.createElement('div');
      box.className = 'actions';
      box.append(
        button('Editar', 'user-edit', 'secondary', () => editUser(u)),
        button('Eliminar', 'user-delete', 'danger', () => deleteUser(u.id)),
      );
      actions.append(box);
      tr.append(actions);
      body.append(tr);
    }
  } catch (err) {
    showError('user-error', err.message);
  }
}

function editUser(u) {
  $('u-id').value = u.id;
  $('u-name').value = u.name;
  $('u-email').value = u.email;
  $('u-password').value = '';
  $('u-role').value = u.role;
}

function clearUser() {
  $('user-form').reset();
  $('u-id').value = '';
  showError('user-error', '');
}

async function deleteUser(id) {
  try {
    await api('/users/' + id, { method: 'DELETE' });
    loadUsers();
  } catch (err) {
    showError('user-error', err.message);
  }
}

$('u-cancel').addEventListener('click', clearUser);
$('user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('user-error', '');
  const id = $('u-id').value;
  const body = { name: $('u-name').value, email: $('u-email').value, role: $('u-role').value };
  if ($('u-password').value) body.password = $('u-password').value;
  if (!id && !body.password) return showError('user-error', 'La contraseña es obligatoria al crear');
  try {
    await api(id ? '/users/' + id : '/users', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    clearUser();
    loadUsers();
  } catch (err) {
    showError('user-error', err.message);
  }
});

render();
