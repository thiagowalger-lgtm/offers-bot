document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  let wappConnInterval = null;

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active classes
      navItems.forEach(nav => nav.classList.remove('active'));
      tabContents.forEach(tab => tab.classList.remove('active'));

      // Clear previous interval if any
      if (wappConnInterval) {
        clearInterval(wappConnInterval);
        wappConnInterval = null;
      }

      // Add active to clicked
      item.classList.add('active');
      const tabId = item.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');

      // Refresh data based on tab
      if (tabId === 'dashboard') loadDashboard();
      if (tabId === 'whatsapp') loadWhatsAppQueue();
      if (tabId === 'settings') loadGroups();
      if (tabId === 'whatsapp-conn') {
        loadWhatsAppConn();
        wappConnInterval = setInterval(loadWhatsAppConn, 3000);
      }
    });
  });

  // API Base URL
  const API_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

  // Toast System
  function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.backgroundColor = isError ? 'var(--danger)' : 'var(--primary)';
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Load Dashboard Data
  async function loadDashboard() {
    try {
      const res = await fetch(`${API_URL}/offers`);
      const data = await res.json();
      
      document.getElementById('statSent').textContent = data.length;
      
      const tbody = document.getElementById('sentProductsBody');
      tbody.innerHTML = '';
      
      data.forEach(item => {
        const date = new Date(item.sent_at).toLocaleString('pt-BR');
        tbody.innerHTML += `
          <tr>
            <td>#${item.id}</td>
            <td><strong>${item.name}</strong></td>
            <td><span class="badge" style="background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${item.niche}</span></td>
            <td>${date}</td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }

  // Load WhatsApp Queue
  async function loadWhatsAppQueue() {
    try {
      const res = await fetch(`${API_URL}/whatsapp-queue`);
      const data = await res.json();
      
      document.getElementById('statQueue').textContent = data.length;
      
      const grid = document.getElementById('whatsappQueueGrid');
      grid.innerHTML = '';
      
      if (data.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">Nenhuma mensagem pendente na fila.</p>';
        return;
      }

      data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card glass message-card';
        div.innerHTML = `
          <span class="niche-tag">${item.niche}</span>
          <div class="message-content" id="msg-${item.id}">${item.message}</div>
          <div class="message-actions">
            <button class="btn-copy" onclick="copyMessage(${item.id})">Copiar Texto</button>
            <button class="btn-success" onclick="markAsSent(${item.id})">Marcar como Enviado</button>
          </div>
        `;
        grid.appendChild(div);
      });
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  }

  // Global functions for inline handlers
  window.copyMessage = function(id) {
    const text = document.getElementById(`msg-${id}`).innerText;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Mensagem copiada!');
    });
  };

  window.markAsSent = async function(id) {
    try {
      const res = await fetch(`${API_URL}/mark-whatsapp-sent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      if (res.ok) {
        showToast('Mensagem marcada como enviada!');
        loadWhatsAppQueue();
        loadDashboard();
      }
    } catch (error) {
      showToast('Erro ao atualizar.', true);
    }
  };

  // Load Groups
  async function loadGroups() {
    try {
      const res = await fetch(`${API_URL}/groups`);
      const data = await res.json();
      
      const tbody = document.getElementById('groupsBody');
      tbody.innerHTML = '';
      
      data.forEach(item => {
        const platformIcon = item.platform === 'telegram' ? '✈️' : '💬';
        tbody.innerHTML += `
          <tr>
            <td><strong>${item.niche}</strong></td>
            <td>${platformIcon} <span style="text-transform: capitalize;">${item.platform}</span></td>
            <td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${item.target_id}</code></td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  }

  // Quick Offer Form Submit
  document.getElementById('quickOfferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnQuickAdd');
    const originalText = btn.innerText;
    
    btn.innerText = 'Extraindo dados... ⏳';
    btn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/quick-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: document.getElementById('quickLink').value })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showToast(`Sucesso! ${data.product.name} extraído.`);
        e.target.reset();
      } else {
        showToast(data.error || 'Erro ao extrair oferta.', true);
      }
    } catch (error) {
      showToast('Erro de conexão.', true);
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });

  // Add Offer Form Submit
  document.getElementById('addOfferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
      name: document.getElementById('offerName').value,
      oldPrice: parseFloat(document.getElementById('offerOldPrice').value),
      currentPrice: parseFloat(document.getElementById('offerCurrentPrice').value),
      discount: parseFloat(document.getElementById('offerDiscount').value || 0),
      category: document.getElementById('offerCategory').value,
      image: document.getElementById('offerImage').value,
      affiliateLink: document.getElementById('offerLink').value
    };

    try {
      const res = await fetch(`${API_URL}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showToast('Oferta adicionada à fila com sucesso!');
        e.target.reset();
      } else {
        showToast('Erro ao adicionar oferta.', true);
      }
    } catch (error) {
      showToast('Erro de conexão.', true);
    }
  });

  // Add Group Form Submit
  document.getElementById('addGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
      niche: document.getElementById('groupNiche').value,
      platform: document.getElementById('groupPlatform').value,
      target_id: document.getElementById('groupTargetId').value
    };

    try {
      const res = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showToast('Grupo cadastrado com sucesso!');
        e.target.reset();
        loadGroups();
      } else {
        showToast('Erro ao cadastrar grupo.', true);
      }
    } catch (error) {
      showToast('Erro de conexão.', true);
    }
  });

  // Run Jobs Button
  document.getElementById('btnRunJobs').addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_URL}/run-now`, { method: 'POST' });
      if (res.ok) {
        showToast('Processamento iniciado em background! 🚀');
      }
    } catch (error) {
      showToast('Erro ao iniciar processamento.', true);
    }
  });

  // Load WhatsApp Connection
  async function loadWhatsAppConn() {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/status`);
      const data = await res.json();
      
      const indicator = document.getElementById('wappConnIndicator');
      const statusText = document.getElementById('wappConnStatusText');
      const desc = document.getElementById('wappConnDesc');
      const spinner = document.getElementById('wappQrSpinner');
      const qrImage = document.getElementById('wappQrImage');
      const placeholder = document.getElementById('wappQrPlaceholder');
      const groupsCard = document.getElementById('wappGroupsCard');
      const groupsBody = document.getElementById('wappGroupsBody');

      if (data.status === 'connected') {
        indicator.style.backgroundColor = 'var(--accent)';
        indicator.style.boxShadow = '0 0 10px var(--accent)';
        statusText.textContent = 'Conectado';
        desc.textContent = 'O bot está conectado ao WhatsApp e pronto para enviar ofertas.';
        
        spinner.style.display = 'none';
        qrImage.style.display = 'none';
        placeholder.style.display = 'block';
        groupsCard.style.display = 'block';

        // Fetch groups list if body is empty
        if (groupsBody.children.length === 0) {
          try {
            const gRes = await fetch(`${API_URL}/api/whatsapp/groups`);
            if (gRes.ok) {
              const groups = await gRes.json();
              groupsBody.innerHTML = '';
              if (groups.length === 0) {
                groupsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum grupo participante encontrado. Adicione o bot a um grupo primeiro.</td></tr>';
              } else {
                groups.forEach(g => {
                  groupsBody.innerHTML += `
                    <tr>
                      <td><strong>${g.name}</strong></td>
                      <td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${g.id}</code></td>
                    </tr>
                  `;
                });
              }
            }
          } catch (gErr) {
            console.error('Error loading WhatsApp groups:', gErr);
          }
        }
      } else if (data.status === 'qr_ready' && data.qr) {
        indicator.style.backgroundColor = '#f59e0b';
        indicator.style.boxShadow = '0 0 10px #f59e0b';
        statusText.textContent = 'Aguardando QR Code';
        desc.textContent = 'Escaneie o QR Code ao lado usando o menu "Aparelhos conectados" no seu celular.';
        
        spinner.style.display = 'none';
        qrImage.style.display = 'block';
        qrImage.src = data.qr;
        placeholder.style.display = 'none';
        groupsCard.style.display = 'none';
        groupsBody.innerHTML = '';
      } else {
        indicator.style.backgroundColor = 'var(--danger)';
        indicator.style.boxShadow = '0 0 10px var(--danger)';
        statusText.textContent = 'Desconectado';
        desc.textContent = 'O bot do WhatsApp está aguardando conexão. Se o QR Code não aparecer em instantes, certifique-se de que o servidor está rodando.';
        
        spinner.style.display = 'block';
        qrImage.style.display = 'none';
        placeholder.style.display = 'none';
        groupsCard.style.display = 'none';
        groupsBody.innerHTML = '';
      }
    } catch (error) {
      console.error('Error fetching WhatsApp connection status:', error);
    }
  }

  // Initial Load
  loadDashboard();
  loadWhatsAppQueue();
});
