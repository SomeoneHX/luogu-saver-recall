async function pageAdmin() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="ui grid">
      <div class="sixteen wide column">
        <div class="card shadow">
          <h1 class="ui center aligned header"><span><i class="ui cog icon colored"></i>管理后台</span><div class="sub header" style="margin-top: 10px;">系统管理控制面板</div></h1>
        </div>
      </div>
    </div>
    <div class="ui grid">
      <div class="eight wide column">
        <div class="card shadow">
          <h3 class="ui header"><i class="ui icon tasks colored"></i> 队列状态</h3>
          <div id="queue-stats" style="text-align:center;padding:20px;">加载中...</div>
        </div>
      </div>
      <div class="eight wide column">
        <div class="card shadow">
          <h3 class="ui header"><i class="ui icon bullhorn colored"></i> 公告管理</h3>
          <div style="margin-bottom:10px;">
            <textarea id="admin-announcement-content" class="ui fluid input" style="width:100%;min-height:100px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;" placeholder="公告内容（支持 HTML）"></textarea>
          </div>
          <div class="ui toggle checkbox" style="margin-bottom:10px;display:block;">
            <input type="checkbox" id="admin-announcement-enabled">
            <label>启用公告</label>
          </div>
          <button id="admin-save-announcement" class="ui primary button"><i class="ui icon save"></i> 保存公告</button>
        </div>
      </div>
    </div>
    <div class="ui grid">
      <div class="sixteen wide column">
        <div class="card shadow">
          <h3 class="ui header"><i class="ui icon users colored"></i> 用户信息</h3>
          <div id="admin-user-info" style="padding:10px;">
            <button id="admin-refresh-user" class="ui button"><i class="ui icon refresh"></i> 刷新用户信息</button>
          </div>
        </div>
      </div>
    </div>
    <div class="ui grid">
      <div class="sixteen wide column">
        <div class="card shadow">
          <h3 class="ui header"><i class="ui icon image colored"></i> 广告管理</h3>
          <div style="margin-bottom:10px;">
            <button id="admin-add-ad" class="ui button"><i class="ui icon plus"></i> 添加广告</button>
            <button id="admin-save-ads" class="ui primary button"><i class="ui icon save"></i> 保存广告配置</button>
          </div>
          <div id="admin-ads-container"><p style="text-align:center;color:gray;padding:20px;">加载中...</p></div>
        </div>
      </div>
    </div>`;

  try {
    const queues = await api.get('/stats/queues');
    const q = queues.queues || queues;
    const qArr = Array.isArray(q) ? q : Object.values(q);
    let qHtml = '';
    qArr.forEach(function (queue) {
      qHtml += '<div style="margin:10px 0;padding:10px;background:#f8fafc;border-radius:8px;"><strong>' + (queue.name || queue.queue || 'default') + '</strong><br/><span>等待: ' + (queue.waiting || 0) + ' | 活跃: ' + (queue.active || 0) + ' | 已完成: ' + (queue.completed || 0) + ' | 失败: ' + (queue.failed || 0) + '</span></div>';
    });
    document.getElementById('queue-stats').innerHTML = qHtml || '<p>暂无队列数据</p>';
  } catch (err) {
    document.getElementById('queue-stats').innerHTML = '<p style="color:red;">加载失败: ' + (err.message || '未知错误') + '</p>';
  }

  try {
    const announcement = await api.get('/admin/announcement').catch(() => null);
    if (announcement) {
      document.getElementById('admin-announcement-content').value = announcement.content || '';
      document.getElementById('admin-announcement-enabled').checked = announcement.enabled !== false;
    }
  } catch (e) { /* noop */ }

  document.getElementById('admin-save-announcement')?.addEventListener('click', async function () {
    const content = document.getElementById('admin-announcement-content').value;
    const enabled = document.getElementById('admin-announcement-enabled').checked;
    try {
      await api.put('/admin/announcement', { content, enabled });
      Swal.fire('成功', '公告更新成功', 'success');
    } catch (err) {
      Swal.fire('失败', err.message || '更新失败', 'error');
    }
  });

  document.getElementById('admin-refresh-user')?.addEventListener('click', async function () {
    try {
      const user = await api.get('/auth/me');
      document.getElementById('admin-user-info').innerHTML = '<p>UID: ' + (user.uid || 'N/A') + '<br/>Role: ' + (user.role !== undefined ? user.role : 'N/A') + '</p><button id="admin-refresh-user" class="ui button"><i class="ui icon refresh"></i> 刷新用户信息</button>';
    } catch (err) {
      Swal.fire('获取失败', err.message, 'error');
    }
  });

  function renderAdminAd(ad, index) {
    const div = document.createElement('div');
    div.className = 'ad-item';
    div.dataset.index = index;
    div.style.cssText = 'border:1px solid #e2e8f0;border-radius:8px;padding:15px;margin-bottom:15px;';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span class="ui label">广告 #${index + 1}</span>
        <div>
          <button class="ui mini icon button ad-move-up" title="上移"><i class="chevron up icon"></i></button>
          <button class="ui mini icon button ad-move-down" title="下移"><i class="chevron down icon"></i></button>
          <button class="ui mini red icon button ad-remove" title="删除"><i class="trash icon"></i></button>
        </div>
      </div>
      <div class="ui form">
        <div class="two fields">
          <div class="field">
            <label>图片 URL</label>
            <input type="text" class="ad-image-url" placeholder="https://example.com/banner.webp" value="${escapeHtml(ad.imageUrl || '')}">
          </div>
          <div class="field">
            <label>跳转 URL（可选）</label>
            <input type="text" class="ad-target-url" placeholder="https://example.com" value="${escapeHtml(ad.targetUrl || '')}">
          </div>
        </div>
        <div class="field">
          <label>描述文字</label>
          <input type="text" class="ad-alt-text" placeholder="描述广告图片内容" value="${escapeHtml(ad.altText || '')}" maxlength="255">
        </div>
        <div class="field">
          <div class="ui toggle checkbox">
            <input type="checkbox" class="ad-enabled" ${ad.enabled !== false ? 'checked' : ''}>
            <label>启用</label>
          </div>
        </div>
        <div class="ad-preview" style="margin-top:10px;">
          <img src="${escapeHtml(ad.imageUrl || '')}" style="max-width:200px;max-height:100px;border-radius:4px;${ad.imageUrl ? '' : 'display:none;'}" onerror="this.style.display='none';this.nextElementSibling.style.display=''">
          <span class="ad-preview-placeholder" style="color:#999;font-size:0.9em;${ad.imageUrl ? 'display:none;' : ''}">暂无预览</span>
        </div>
      </div>`;
    return div;
  }

  function renderAdminAds(ads) {
    const container = document.getElementById('admin-ads-container');
    container.innerHTML = '';
    if (ads.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:gray;padding:20px;">暂无广告，点击上方"添加广告"按钮创建</p>';
      return;
    }
    ads.forEach(function (ad, i) {
      container.appendChild(renderAdminAd(ad, i));
    });
    document.querySelectorAll('#admin-ads-container .ui.toggle.checkbox').forEach(function (el) {
      $(el).checkbox();
    });
  }

  try {
    const adsResult = await api.get('/admin/advertisements');
    const adsData = adsResult.advertisements || [];
    renderAdminAds(adsData);
  } catch (e) {
    document.getElementById('admin-ads-container').innerHTML = '<p style="text-align:center;color:red;padding:20px;">广告加载失败</p>';
  }

  document.getElementById('admin-add-ad')?.addEventListener('click', function () {
    const container = document.getElementById('admin-ads-container');
    const items = container.querySelectorAll('.ad-item');
    if (items.length >= 10) {
      Swal.fire('提示', '最多只能添加 10 个广告', 'info');
      return;
    }
    if (items.length === 0) container.innerHTML = '';
    const ad = { imageUrl: '', altText: '', targetUrl: '', enabled: true };
    container.appendChild(renderAdminAd(ad, items.length));
    $(container.lastElementChild.querySelector('.ui.toggle.checkbox')).checkbox();
    container.lastElementChild.querySelector('.ad-image-url')?.focus();
  });

  document.getElementById('admin-ads-container')?.addEventListener('click', function (e) {
    const item = e.target.closest('.ad-item');
    if (!item) return;
    const container = document.getElementById('admin-ads-container');

    if (e.target.closest('.ad-move-up')) {
      const idx = Array.from(container.children).indexOf(item);
      if (idx > 0) {
        container.insertBefore(item, container.children[idx - 1]);
        reindexAdminAds();
      }
    } else if (e.target.closest('.ad-move-down')) {
      const idx = Array.from(container.children).indexOf(item);
      if (idx < container.children.length - 1) {
        container.insertBefore(container.children[idx + 1], item);
        reindexAdminAds();
      }
    } else if (e.target.closest('.ad-remove')) {
      item.remove();
      reindexAdminAds();
      const container2 = document.getElementById('admin-ads-container');
      if (container2.querySelectorAll('.ad-item').length === 0) {
        container2.innerHTML = '<p style="text-align:center;color:gray;padding:20px;">暂无广告，点击上方"添加广告"按钮创建</p>';
      }
    }
  });

  document.getElementById('admin-ads-container')?.addEventListener('input', function (e) {
    if (e.target.classList.contains('ad-image-url')) {
      const item = e.target.closest('.ad-item');
      if (!item) return;
      const img = item.querySelector('.ad-preview img');
      const placeholder = item.querySelector('.ad-preview-placeholder');
      const url = e.target.value.trim();
      if (url) {
        img.src = url;
        img.style.display = '';
        placeholder.style.display = 'none';
      } else {
        img.style.display = 'none';
        placeholder.style.display = '';
      }
    }
  });

  function reindexAdminAds() {
    const container = document.getElementById('admin-ads-container');
    const items = container.querySelectorAll('.ad-item');
    items.forEach(function (item, i) {
      item.dataset.index = i;
      const label = item.querySelector('.ui.label');
      if (label) label.textContent = '广告 #' + (i + 1);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  document.getElementById('admin-save-ads')?.addEventListener('click', async function () {
    const items = document.querySelectorAll('#admin-ads-container .ad-item');
    const ads = [];
    items.forEach(function (item) {
      const imageUrl = item.querySelector('.ad-image-url')?.value.trim() || '';
      const altText = item.querySelector('.ad-alt-text')?.value.trim() || '';
      const targetUrl = item.querySelector('.ad-target-url')?.value.trim() || null;
      const enabled = item.querySelector('.ad-enabled')?.checked !== false;
      if (imageUrl && altText) {
        ads.push({ imageUrl, altText, targetUrl, enabled, sortOrder: ads.length });
      }
    });
    try {
      const btn = document.getElementById('admin-save-ads');
      btn.classList.add('loading');
      await api.put('/admin/advertisements', { advertisements: ads });
      Swal.fire('成功', '广告配置更新成功', 'success');
      const result = await api.get('/admin/advertisements');
      renderAdminAds(result.advertisements || []);
    } catch (err) {
      Swal.fire('失败', err.message || '更新失败', 'error');
    } finally {
      document.getElementById('admin-save-ads')?.classList.remove('loading');
    }
  });
}
