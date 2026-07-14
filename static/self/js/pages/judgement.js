var jPage = 1;
var jLimit = 10;
var jTotalPages = 0;

const JUDGEMENT_API = 'https://jdmt.luogu.me/api';

const PERM_MAP = [
  { id: 1, name: "登录鉴权" },
  { id: 2, name: "进入主站" },
  { id: 4, name: "进入后台" },
  { id: 8, name: "题目管理" },
  { id: 16, name: "团队管理" },
  { id: 32, name: "比赛管理" },
  { id: 64, name: "秩序管理" },
  { id: 128, name: "未知权限#128" },
  { id: 256, name: "用户管理" },
  { id: 512, name: "专栏管理" },
  { id: 32768, name: "自由发言" },
  { id: 65536, name: "发送私信" },
  { id: 131072, name: "使用专栏" },
  { id: 262144, name: "未知权限#262144" },
  { id: 524288, name: "使用图床" },
  { id: 2097152, name: "题库志愿者" },
  { id: 4194304, name: "专栏志愿者" },
  { id: 1073741824, name: "超级用户" },
];

function jEscape(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function jFormatDate(unix) {
  var d = new Date(unix * 1000);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function getPermissionNames(val) {
  if (!val) return [];
  var names = [];
  var remaining = val;
  for (var i = PERM_MAP.length - 1; i >= 0; i--) {
    var p = PERM_MAP[i];
    if ((remaining & p.id) === p.id) {
      names.unshift(p.name);
      remaining -= p.id;
    }
  }
  if (!names.length) names.push('未知权限');
  return names;
}

function colorClass(color) {
  if (!color) return 'Gray';
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}

async function loadStats() {
  try {
    var r = await fetch(JUDGEMENT_API + '/stats').then(function (d) { return d.json(); });
    if (r.success) {
      var el = document.getElementById('j-stats');
      if (el) el.textContent = '共 ' + r.data.total_judgements + ' 条记录 · ' + r.data.total_fetch_logs + ' 次抓取';
    }
  } catch (e) {
    var el = document.getElementById('j-stats');
    if (el) el.textContent = '统计信息获取失败（CORS 跨域限制或网络不可用）';
  }
}

async function loadJudgements(page) {
  jPage = page;
  var c = document.getElementById('j-cards');
  if (!c) return;
  c.innerHTML = '<div style="text-align:center;padding:40px 0;"><div class="ui active centered inline loader"></div></div>';

  var url = JUDGEMENT_API + '/judgement?page=' + jPage + '&limit=' + jLimit;
  try {
    var r = await fetch(url).then(function (d) { return d.json(); });
    if (!r.success) {
      c.innerHTML = '<div class="sixteen wide column"><div class="card shadow outline"><div style="text-align:center;padding:50px 0;"><i class="ui icon info circle" style="font-size:3rem;color:gray;"></i><div style="font-size:1.5rem;color:gray;margin-top:10px;">加载失败：' + jEscape(r.error || '未知错误') + '</div></div></div></div>';
      return;
    }
    if (!r.data || !r.data.length) {
      c.innerHTML = '<div class="sixteen wide column"><div class="card shadow outline"><div style="text-align:center;padding:50px 0;"><i class="ui icon info circle" style="font-size:3rem;color:gray;"></i><div style="font-size:1.5rem;color:gray;margin-top:10px;">暂无陶片放逐记录</div></div></div></div>';
      renderPagination(r.pagination);
      return;
    }

    var html = '';
    for (var i = 0; i < r.data.length; i++) {
      var x = r.data[i];
      var uid = x.uid;
      var name = x.name || '用户 ' + uid;
      var cc = colorClass(x.user && x.user.color);
      var avatarUrl = 'https://cdn.luogu.com.cn/upload/usericon/' + uid + '.png';
      var dateStr = jFormatDate(x.time);
      var reason = jEscape(x.reason || '') + '。';

      var permHtml = '';
      var hasPerm = (x.revoked_permission > 0) || (x.added_permission > 0);
      if (hasPerm) {
        permHtml = '<div class="judgement-permissions"><ul>';
        if (x.added_permission > 0) {
          var granted = getPermissionNames(x.added_permission);
          for (var g = 0; g < granted.length; g++) {
            permHtml += '<li>授予 <span class="permission-badge permission-granted">' + jEscape(granted[g]) + '</span> 权限</li>';
          }
        }
        if (x.revoked_permission > 0) {
          var revoked = getPermissionNames(x.revoked_permission);
          for (var r2 = 0; r2 < revoked.length; r2++) {
            permHtml += '<li>撤销 <span class="permission-badge permission-revoked">' + jEscape(revoked[r2]) + '</span> 权限</li>';
          }
        }
        permHtml += '</ul></div>';
      }

      html += '<div class="card shadow outline"><div style="display:flex;flex:1;"><div><div style="width:70px;" class="meta user">';
      html += '<img class="ui circular image" src="' + avatarUrl + '" alt="' + jEscape(name) + '" onerror="this.src=\'https://cdn.luogu.com.cn/upload/usericon/3.png\'">';
      html += '</div></div><div style="margin-left:20px;flex:1;">';
      html += '<div class="judgement-user-name">@<a href="/user/' + uid + '" class="user-' + cc + '">' + jEscape(name) + '</a></div>';
      html += '<div class="judgement-meta meta gray"><i class="fas fa-calendar-alt"></i> <span>' + dateStr + '</span></div>';
      html += permHtml;
      html += '<div class="judgement-reason">' + reason + '</div>';
      html += '</div></div></div>';
    }
    c.innerHTML = html;
    renderPagination(r.pagination);
  } catch (e) {
    var msg = '请求失败：' + jEscape(e.message || '未知错误');
    var testUrl = JUDGEMENT_API + '/judgement?page=1&limit=1';
    msg += '<br><br><span style="font-size:0.85rem;color:#888;">可能原因：<b>跨域请求被浏览器拦截（CORS）</b>或 jdmt 后端服务暂不可用。<br>';
    msg += '您可直接访问此链接测试（浏览器打开若返回 JSON 则为 CORS 问题）：<br>';
    msg += '<a href="' + testUrl + '" target="_blank" style="font-size:0.8rem;word-break:break-all;">' + jEscape(testUrl) + '</a></span>';
    c.innerHTML = '<div class="sixteen wide column"><div class="card shadow outline"><div style="text-align:center;padding:40px 0;"><i class="ui icon warning circle" style="font-size:3rem;color:#d03050;"></i><div style="font-size:1.1rem;color:#495057;margin-top:10px;">' + msg + '</div></div></div></div>';
  }
}

function renderPagination(pagination) {
  var el = document.getElementById('j-pagination');
  if (!el) return;
  if (!pagination || pagination.total_pages <= 1) {
    el.innerHTML = '';
    jTotalPages = 0;
    return;
  }
  jTotalPages = pagination.total_pages;
  var current = pagination.page;
  var total = pagination.total_pages;

  var startPage = current - 2;
  if (startPage < 1) startPage = 1;
  var endPage = current + 2;
  if (endPage > total) endPage = total;

  var html = '<div class="card shadow" style="text-align:center;"><div class="ui pagination menu">';

  if (current > 1) {
    html += '<a class="item" onclick="loadJudgements(' + (current - 1) + ')"><i class="left chevron icon"></i></a>';
  }

  for (var i = startPage; i <= endPage; i++) {
    var active = i === current ? ' active' : '';
    html += '<a class="item' + active + '" onclick="loadJudgements(' + i + ')">' + i + '</a>';
  }

  if (current < total) {
    html += '<a class="item" onclick="loadJudgements(' + (current + 1) + ')"><i class="right chevron icon"></i></a>';
  }

  html += '</div></div>';
  el.innerHTML = html;
}

function changePerPage(value) {
  jLimit = parseInt(value);
  jPage = 1;
  loadJudgements(1);
}

async function pageJudgement() {
  var el = document.getElementById('page-content');
  el.innerHTML =
    '<div class="ui grid"><div class="sixteen wide column"><div class="card shadow"><h1 class="ui center aligned header"><span><i class="ui gavel icon colored"></i> 陶片放逐</span><div class="sub header" style="margin-top:10px;"><p>此处公布近期涉及到用户权限变更（即封号、禁言、禁止私信）的管理日志，以提升管理流程透明度，以及引起部分用户警示。</p><p style="color:#888;font-size:.85rem;margin-top:6px;" id="j-stats">加载中…</p></div></h1><div style="text-align:center;"><a id="save-btn" class="ui blue button" title="点击更新陶片放逐记录"><i class="ui icon sync alternate"></i> 更新陶片放逐记录</a><a href="https://www.luogu.com.cn/judgement" target="_blank" class="ui green button"><i class="ui icon code"></i> 查看原网页</a></div></div></div></div>' +
    '<div class="ui grid"><div class="sixteen wide column"><div class="ui form"><div class="inline fields"><label>每页显示</label><div class="ui selection dropdown" id="per-page-dropdown" style="width:100px;min-width:100px;"><input type="hidden" name="perPage" value="' + jLimit + '"><i class="dropdown icon"></i><div class="default text">选择每页条数</div><div class="menu"><div class="item" data-value="10">10 条</div><div class="item" data-value="20">20 条</div><div class="item" data-value="30">30 条</div><div class="item" data-value="40">40 条</div><div class="item" data-value="50">50 条</div></div></div></div></div></div></div>' +
    '<div class="ui grid" id="j-cards"><div class="sixteen wide column"><div style="text-align:center;padding:40px 0;"><div class="ui active centered inline loader"></div></div></div></div>' +
    '<div id="j-pagination"></div>';

  $('#per-page-dropdown').dropdown({
    onChange: function (value) { changePerPage(value); }
  });
  $('#per-page-dropdown').dropdown('set selected', String(jLimit));

  document.getElementById("save-btn")?.addEventListener("click", function () {
    Swal.fire({
      icon: 'info',
      title: '提示',
      text: '陶片放逐记录由系统自动更新，无需手动操作。',
      confirmButtonText: '确定'
    });
  });

  loadStats();
  loadJudgements(1);
}
