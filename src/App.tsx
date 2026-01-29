import { useEffect, useMemo, useState } from 'react'
import {
  LogIn,
  LogOut,
  RefreshCcw,
  Search,
  UploadCloud,
  Loader2,
  KeyRound,
  ShieldCheck,
  Database,
} from 'lucide-react'

const REFERRAL_URL =
  'https://jrudysuexokhmfrqeiaw.supabase.co/functions/v1/referral-admin?format=json'
const IMPORT_URL =
  'https://jrudysuexokhmfrqeiaw.supabase.co/functions/v1/reward-codes-import'
const STATS_URL =
  'https://jrudysuexokhmfrqeiaw.supabase.co/functions/v1/reward-codes-stats'
const TOKEN_KEY = 'admin_token'

type UserInfo = {
  nickname?: string
  name?: string
  avatar_url?: string
  avatar?: string
}

type ReferralItem = {
  share_code?: string
  reward_code?: string
  created_at?: string
  referrer?: UserInfo
  referred?: UserInfo
  referrer_nickname?: string
  referred_nickname?: string
  referrer_avatar?: string
  referred_avatar?: string
}

type RewardCodeItem = {
  code: string
  assigned_to: string | null
  assigned_at: string | null
  used_at: string | null
}

type RewardStats = {
  summary: {
    total: number
    used: number
    unused: number
  }
  used: RewardCodeItem[]
  unused: RewardCodeItem[]
}

const getName = (item: ReferralItem, type: 'referrer' | 'referred') => {
  const directKey = type === 'referrer' ? 'referrer_nickname' : 'referred_nickname'
  return (
    item[type]?.nickname ||
    item[type]?.name ||
    item[directKey] ||
    '未知用户'
  )
}

const getAvatar = (item: ReferralItem, type: 'referrer' | 'referred') => {
  const directKey = type === 'referrer' ? 'referrer_avatar' : 'referred_avatar'
  return item[type]?.avatar_url || item[type]?.avatar || item[directKey] || ''
}

const getInitial = (name: string) =>
  name.trim().charAt(0).toUpperCase() || '?'

const formatDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function fetchReferrals(adminToken: string) {
  console.log('[referrals] request', REFERRAL_URL)
  const response = await fetch(REFERRAL_URL, {
    headers: {
      'X-Admin-Token': adminToken,
    },
  })
  console.log('[referrals] status', response.status)
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    console.warn('[referrals] error', errorText)
    throw new Error('TOKEN_INVALID')
  }
  const data = await response.json()
  console.log('[referrals] response', data)
  if (Array.isArray(data)) return data as ReferralItem[]
  if (Array.isArray(data?.data)) return data.data as ReferralItem[]
  return []
}

function App() {
  const [tokenInput, setTokenInput] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ReferralItem[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [stats, setStats] = useState<RewardStats | null>(null)
  const [statsTab, setStatsTab] = useState<'used' | 'unused'>('used')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) return
    setTokenInput(token)
    handleLogin(token, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((item) => {
      const referrer = getName(item, 'referrer').toLowerCase()
      const referred = getName(item, 'referred').toLowerCase()
      const shareCode = item.share_code?.toLowerCase() ?? ''
      return (
        referrer.includes(keyword) ||
        referred.includes(keyword) ||
        shareCode.includes(keyword)
      )
    })
  }, [items, search])

  const handleLogin = async (value: string, silent = false) => {
    const adminToken = value.trim()
    if (!adminToken) {
      setError('请输入 Admin Token')
      return
    }
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const data = await fetchReferrals(adminToken)
      setItems(data)
      setAuthed(true)
      setToken(adminToken)
      localStorage.setItem(TOKEN_KEY, adminToken)
    } catch {
      if (!silent) {
        setError('Token 无效或已过期')
      }
      setAuthed(false)
      setToken('')
      localStorage.removeItem(TOKEN_KEY)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const data = await fetchReferrals(token)
      setItems(data)
    } catch {
      setError('刷新失败，请检查 Token')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthed(false)
    setToken('')
    setTokenInput('')
    setItems([])
    setSearch('')
    setNotice('')
    localStorage.removeItem(TOKEN_KEY)
  }

  const handleImport = async () => {
    const codes = importText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (!codes.length) {
      setNotice('请输入至少一个兑换码')
      return
    }

    setImportLoading(true)
    setNotice('')
    try {
      console.log('[import] payload', codes)
      const response = await fetch(IMPORT_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify(codes),
      })
      console.log('[import] status', response.status)
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.warn('[import] error', errorText)
        throw new Error('IMPORT_FAILED')
      }
      const responseText = await response.text().catch(() => '')
      if (responseText) {
        console.log('[import] response', responseText)
      }
      setImportText('')
      setImportOpen(false)
      setNotice(`导入成功：${codes.length} 个兑换码`)
    } catch {
      setNotice('导入失败，请检查 Token 或网络')
    } finally {
      setImportLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!token) return
    setStatsLoading(true)
    setError('')
    try {
      console.log('[stats] request', STATS_URL)
      const response = await fetch(STATS_URL, {
        headers: {
          'X-Admin-Token': token,
        },
      })
      console.log('[stats] status', response.status)
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.warn('[stats] error', errorText)
        throw new Error('STATS_FAILED')
      }
      const raw = (await response.json()) as {
        code?: number
        error?: unknown
        data?: RewardStats
      }
      const payload = (raw?.data ?? raw) as RewardStats
      console.log('[stats] response', payload)
      setStats(payload)
    } catch {
      setError('获取兑换码统计失败，请检查 Token')
    } finally {
      setStatsLoading(false)
    }
  }

  const handleOpenStats = async () => {
    if (!token) return
    setStatsOpen(true)
    if (stats) return
    fetchStats()
  }

  if (!authed) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-cyan-400/18 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_55%)]" />
        </div>
        <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-5xl rounded-[36px] border border-slate-800/70 bg-slate-900/50 p-6 shadow-2xl backdrop-blur sm:p-10">
            <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  Secure Admin Gateway
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    <span className="bg-gradient-to-r from-cyan-200 via-sky-200 to-blue-200 bg-clip-text text-transparent">
                      分享邀请管理后台
                    </span>
                  </h1>
                  <p className="mt-3 text-sm text-slate-400 sm:text-base">
                    一站式管理分享邀请与兑换码导入，简洁、酷炫、专注效率。
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    '实时拉取分享记录',
                    '昵称/分享码快速搜索',
                    '一键导入兑换码',
                    '安全 Token 验证',
                  ].map((text) => (
                    <div
                      key={text}
                      className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 shadow-inner"
                    >
                      {text}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-1">
                    Cloudflare Pages 部署
                  </span>
                  <span className="rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-1">
                    Supabase Function 驱动
                  </span>
                </div>
              </div>

                <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-7 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500/30 to-cyan-400/30 p-[1px]">
                    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-950/80">
                      <LogIn className="h-5 w-5 text-slate-200" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      管理员登录
                    </h2>
                    <p className="text-sm text-slate-400">
                      请输入 Admin Token 登录
                    </p>
                  </div>
                </div>

                <form
                  className="mt-6 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleLogin(tokenInput)
                  }}
                >
                  <div>
                    <label className="text-sm text-slate-300">Admin Token</label>
                    <div className="relative mt-2">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(event) => setTokenInput(event.target.value)}
                        placeholder="输入 Token"
                        className="w-full rounded-xl border border-slate-700/70 bg-slate-950/80 py-2.5 pl-9 pr-3 text-sm text-slate-100 shadow-inner outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-300 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? '验证中...' : '登录管理后台'}
                  </button>
                  <p className="text-xs text-slate-500">
                    Token 仅存储在本地浏览器，用于请求管理接口。
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-16 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">分享邀请管理</h1>
            <p className="text-sm text-slate-400">
              查看分享记录并导入兑换码
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索昵称或分享码"
                className="w-full rounded-xl border border-slate-800/70 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 shadow-inner outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              刷新
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-300 px-3 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
            >
              <UploadCloud className="h-4 w-4" />
              导入兑换码
            </button>
            <button
              onClick={handleOpenStats}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
            >
              <Database className="h-4 w-4" />
              兑换码统计
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800/70 bg-transparent px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        </header>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-slate-800/70 bg-slate-900/50 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-3">
            <div className="text-sm text-slate-400">
              共 {filteredItems.length} 条记录
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">推荐人</th>
                  <th className="px-4 py-3 text-left font-medium">被推荐人</th>
                  <th className="px-4 py-3 text-left font-medium">分享码</th>
                  <th className="px-4 py-3 text-left font-medium">奖励码</th>
                  <th className="px-4 py-3 text-left font-medium">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {!loading && filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      暂无数据
                    </td>
                  </tr>
                )}
                {filteredItems.map((item, index) => {
                  const referrerName = getName(item, 'referrer')
                  const referredName = getName(item, 'referred')
                  const referrerAvatar = getAvatar(item, 'referrer')
                  const referredAvatar = getAvatar(item, 'referred')
                  return (
                    <tr
                      key={`${item.share_code ?? 'row'}-${index}`}
                      className="transition hover:bg-slate-900/70"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-700/80 bg-slate-800">
                            {referrerAvatar ? (
                              <img
                                src={referrerAvatar}
                                alt={referrerName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                                {getInitial(referrerName)}
                              </div>
                            )}
                          </div>
                          <span className="text-slate-100">{referrerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-700/80 bg-slate-800">
                            {referredAvatar ? (
                              <img
                                src={referredAvatar}
                                alt={referredName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                                {getInitial(referredName)}
                              </div>
                            )}
                          </div>
                          <span className="text-slate-100">{referredName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cyan-200/90">
                        {item.share_code ?? '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-200/90">
                        {item.reward_code ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatDate(item.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setImportOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800/70 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">导入兑换码</h2>
                <p className="text-xs text-slate-400">
                  每行一个兑换码，提交后自动导入
                </p>
              </div>
              <button
                className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                onClick={() => setImportOpen(false)}
              >
                关闭
              </button>
            </div>

            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={8}
              placeholder="code-001&#10;code-002&#10;code-003"
              className="mt-4 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-inner outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            />

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>已输入 {importText.split(/\r?\n/).filter(Boolean).length} 行</span>
              {importLoading && (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中...
                </span>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setImportOpen(false)}
                className="rounded-xl border border-slate-800/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={importLoading}
                className="rounded-xl bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-300 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                提交导入
              </button>
            </div>
          </div>
        </div>
      )}

      {statsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setStatsOpen(false)}
          />
          <div className="relative w-full max-w-5xl rounded-3xl border border-slate-800/70 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">兑换码统计</h2>
                <p className="text-xs text-slate-400">
                  查看已兑换与剩余兑换码
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                  onClick={() => {
                    setStats(null)
                    fetchStats()
                  }}
                >
                  刷新
                </button>
                <button
                  className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                  onClick={() => setStatsOpen(false)}
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3">
                <div className="text-xs text-slate-500">总量</div>
                <div className="text-xl font-semibold text-white">
                  {stats?.summary.total ?? '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3">
                <div className="text-xs text-slate-500">已兑换</div>
                <div className="text-xl font-semibold text-cyan-200">
                  {stats?.summary.used ?? '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3">
                <div className="text-xs text-slate-500">未兑换</div>
                <div className="text-xl font-semibold text-blue-200">
                  {stats?.summary.unused ?? '-'}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setStatsTab('used')}
                className={`rounded-full px-4 py-1 text-xs ${
                  statsTab === 'used'
                    ? 'bg-cyan-300 text-slate-900'
                    : 'border border-slate-700 text-slate-300'
                }`}
              >
                已兑换
              </button>
              <button
                onClick={() => setStatsTab('unused')}
                className={`rounded-full px-4 py-1 text-xs ${
                  statsTab === 'unused'
                    ? 'bg-cyan-300 text-slate-900'
                    : 'border border-slate-700 text-slate-300'
                }`}
              >
                未兑换
              </button>
              {statsLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  加载中...
                </div>
              )}
            </div>

            <div className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-slate-800/70">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">兑换码</th>
                    <th className="px-4 py-3 text-left font-medium">分配给</th>
                    <th className="px-4 py-3 text-left font-medium">分配时间</th>
                    <th className="px-4 py-3 text-left font-medium">兑换时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(statsTab === 'used'
                    ? stats?.used ?? []
                    : stats?.unused ?? []
                  ).map((item) => (
                    <tr key={`${statsTab}-${item.code}`}>
                      <td className="px-4 py-3 font-mono text-xs text-cyan-200/90">
                        {item.code}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.assigned_to ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatDate(item.assigned_at ?? undefined)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatDate(item.used_at ?? undefined)}
                      </td>
                    </tr>
                  ))}
                  {!statsLoading &&
                    (statsTab === 'used'
                      ? stats?.used?.length
                      : stats?.unused?.length) === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-slate-400"
                        >
                          暂无数据
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
