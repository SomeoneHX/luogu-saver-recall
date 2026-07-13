async function pageTask(params) {
  const id = params.id;
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="ui grid">
      <div class="sixteen wide column">
        <div class="card shadow">
          <h1 class="ui center aligned header"><span><i class="ui info icon colored"></i> 任务详情</span><div class="sub header" style="margin-top: 10px; font-family: monospace; font-size: 0.85rem;">` + id + `</div></h1>
        </div>
      </div>
    </div>
    <div class="ui grid">
      <div class="sixteen wide column">
        <div class="card shadow outline">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div><strong>状态</strong> <span id="task-status" class="ui label blue">Pending</span></div>
            <div><strong>创建</strong> <span id="task-created-at" style="color: gray;">-</span></div>
            <div><strong>更新</strong> <span id="task-updated-at" style="color: gray;">-</span></div>
            <div>
              <button id="goto-btn" class="ui mini positive button" disabled><i class="ui icon paper plane"></i> 跳转</button>
              <button id="retry-btn" class="ui mini teal button" style="display:none;"><i class="ui icon redo alternate"></i> 重试</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="ui grid">
      <div class="sixteen wide column">
        <div class="card shadow outline">
          <h3 class="ui dividing header"><i class="ui icon tasks colored"></i> 子任务</h3>
          <div id="task-subtasks" style="margin-top: 1em;"><div class="ui active centered inline loader"></div></div>
        </div>
      </div>
    </div>`;

  let targetType = null;
  let targetOid = null;

  try {
    const stored = sessionStorage.getItem('wt:' + id);
    if (stored) {
      const t = JSON.parse(stored);
      targetOid = t.targetId;
      targetType = t.type;
    }
  } catch (e) { /* ignore */ }

  function getStatusClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'pending' || s === 'created' || s === 'waiting-children' || s === 'inactive') return 'blue';
    if (s === 'processing' || s === 'running' || s === 'active') return 'yellow';
    if (s === 'completed' || s === 'success' || s === 'completed-children') return 'green';
    if (s === 'failed' || s === 'error') return 'red';
    if (s === 'missing') return 'grey';
    return '';
  }

  function isTerminal(status) {
    const s = (status || '').toLowerCase();
    return s === 'completed' || s === 'success' || s === 'failed' || s === 'error';
  }

  function saveTaskCompleted(tasks) {
    if (!tasks || !Array.isArray(tasks)) return false;
    return tasks.some(function (t) {
      const name = t.taskName || t.jobName || t.name || '';
      const s = (t.status || '').toLowerCase();
      return name === 'save' && (s === 'completed' || s === 'success');
    });
  }

  async function fetchTask() {
    try {
      const data = await api.get('/workflow/query/' + id);
      document.getElementById('task-created-at').textContent = data.createdAt || '-';
      document.getElementById('task-updated-at').textContent = data.updatedAt || '-';

      const statusLabel = document.getElementById('task-status');
      statusLabel.className = 'ui label ' + getStatusClass(data.status);
      statusLabel.textContent = data.status || 'Pending';

      const tasks = data.tasks || [];

      function buildChildrenMap(tasks) {
        const m = {};
        for (const t of tasks) {
          if (!m[t.taskName]) m[t.taskName] = [];
          for (const f of (t.fathers || [])) {
            if (!m[f]) m[f] = [];
            m[f].push(t.taskName);
          }
        }
        return m;
      }

      function buildTreeLayers(tasks) {
        const taskMap = new Map(tasks.map(t => [t.taskName, t]));
        const depthCache = new Map();
        function getDepth(name, stack) {
          const cached = depthCache.get(name);
          if (cached !== undefined) return cached;
          const t = taskMap.get(name);
          if (!t || !t.fathers || t.fathers.length === 0 || stack.has(name)) {
            depthCache.set(name, 0);
            return 0;
          }
          stack.add(name);
          const d = Math.max(...t.fathers.map(f => getDepth(f, stack))) + 1;
          stack.delete(name);
          depthCache.set(name, d);
          return d;
        }
        const layers = [];
        for (const t of tasks) {
          const d = getDepth(t.taskName, new Set());
          if (!layers[d]) layers[d] = [];
          layers[d].push(t);
        }
        for (const layer of layers) {
          if (layer) layer.sort((a, b) => a.taskName.localeCompare(b.taskName));
        }
        return layers;
      }

      let html = '';
      if (tasks.length === 0) {
        html = '<div style="text-align:center;padding:20px;color:gray;">暂无子任务信息</div>';
      } else {
        const childrenMap = buildChildrenMap(tasks);
        const layers = buildTreeLayers(tasks);

        html = '<div class="workflow-board">';
        html += '<div class="section-heading"><strong style="font-size:1.05em;">执行树</strong><span style="color:gray;font-size:0.9em;">' + tasks.length + ' 个任务</span></div>';
        html += '<div class="workflow-tree">';

        for (let i = 0; i < layers.length; i++) {
          if (!layers[i]) continue;
          html += '<div class="tree-layer"><div class="layer-label">第 ' + (i + 1) + ' 层</div><div class="layer-nodes">';

          for (const t of layers[i]) {
            const name = t.taskName || t.jobName || t.name || '?';
            const status = t.status || 'pending';
            const statusClass = getStatusClass(status);

            let badges = '';
            if (t.track) badges += '<span class="ui mini teal label">track</span> ';
            if (t.report) badges += '<span class="ui mini purple label">report</span> ';

            const fatherCount = (t.fathers || []).length;
            const childCount = (childrenMap[t.taskName] || []).length;
            const rel = [];
            if (fatherCount > 0) rel.push('↑ ' + fatherCount);
            if (childCount > 0) rel.push('↓ ' + childCount);

            const typeTarget = [t.type, t.target].filter(Boolean).join(' / ');

            html += '<div class="task-node is-' + status + '">';
            html += '  <div class="node-header">';
            html += '    <span class="node-icon"><i class="ui icon circle ' + statusClass + '"></i></span>';
            html += '    <span class="node-name">' + name + '</span>';
            html += '    <span class="ui mini label ' + statusClass + '">' + status + '</span>';
            html += '  </div>';
            if (typeTarget) html += '  <div class="node-detail"><code>' + typeTarget + '</code></div>';
            if (badges) html += '  <div class="node-badges">' + badges + '</div>';
            if (rel.length > 0) html += '  <div class="node-relations">' + rel.join(' &nbsp;') + '</div>';
            html += '</div>';
          }

          html += '</div></div>';
        }

        html += '</div></div>';
      }
      document.getElementById('task-subtasks').innerHTML = html;

      if (targetOid && saveTaskCompleted(tasks)) {
        document.getElementById('goto-btn').disabled = false;
      }

      if (isTerminal(data.status)) {
        document.getElementById('retry-btn').style.display = (data.status || '').toLowerCase() === 'failed' || (data.status || '').toLowerCase() === 'error' ? 'inline-block' : 'none';
        clearInterval(pollInterval);
      }
    } catch (err) {
      console.error('Task poll failed:', err);
    }
  }

  document.getElementById('goto-btn')?.addEventListener('click', function () {
    if (targetOid) {
      if (targetType === 'article') navigate('/article/' + targetOid);
      else if (targetType === 'paste') navigate('/paste/' + targetOid);
      else if (targetType === 'user') navigate('/user/' + targetOid);
      else navigate('/');
    }
  });

  document.getElementById('retry-btn')?.addEventListener('click', function () {
    const oid = targetOid;
    if (oid) {
      const template = targetType === 'article' ? 'article-save-pipeline' : targetType === 'paste' ? 'paste-save-pipeline' : 'article-save-pipeline';
      api.post('/workflow/create/template/' + template, { targetId: oid }).then(function (result) {
        sessionStorage.setItem('wt:' + result.workflowId, JSON.stringify({ targetId: oid, type: targetType }));
        Swal.fire('重试请求已入队', '新任务 ID: ' + result.workflowId, 'success');
      }).catch(function (err) {
        Swal.fire('重试失败', err.message, 'error');
      });
    }
  });

  await fetchTask();
  var pollInterval = setInterval(fetchTask, 1000);
}
