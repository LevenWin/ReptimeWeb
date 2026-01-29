import { useEffect, useMemo, useState } from 'react'
import {
  LogIn,
  LogOut,
  RefreshCcw,
  Search,
  UploadCloud,
  Loader2,
} from 'lucide-react'

const REFERRAL_URL =
  'https://jrudysuexokhmfrqeiaw.supabase.co/functions/v1/referral-admin?format=json'
const IMPORT_URL =
  'https://jrudysuexokhmfrqeiaw.supabase.co/functions/v1/reward-codes-import'
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
  const response = await fetch(REFERRAL_URL, {
    headers: {
      'x-admin-token': adminToken,
    },
  })
  if (!response.ok) {
    throw new Error('TOKEN_INVALID')
  }
  const data = await response.json()
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
      const response = await fetch(IMPORT_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify(codes),
      })
      if (!response.ok) {
        throw new Error('IMPORT_FAILED')
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

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <LogIn className="h-5 w-5 text-slate-200" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">分享邀请管理后台</h1>
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
              <input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="输入 Token"
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white/95 text-slate-900 py-2 text-sm font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? '验证中...' : '登录管理后台'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
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
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
              />
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm hover:border-slate-600"
            >
              <RefreshCcw className="h-4 w-4" />
              刷新
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
            >
              <UploadCloud className="h-4 w-4" />
              导入兑换码
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-transparent px-3 py-2 text-sm text-slate-200 hover:border-slate-600"
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        </header>

        {notice && (
          <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
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
              <thead className="bg-slate-900/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">推荐人</th>
                  <th className="px-4 py-3 text-left font-medium">被推荐人</th>
                  <th className="px-4 py-3 text-left font-medium">分享码</th>
                  <th className="px-4 py-3 text-left font-medium">奖励码</th>
                  <th className="px-4 py-3 text-left font-medium">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
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
                    <tr key={`${item.share_code ?? 'row'}-${index}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
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
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
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
                      <td className="px-4 py-3 font-mono text-xs text-slate-200">
                        {item.share_code ?? '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-200">
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
          <div className="absolute inset-0 bg-black/60" onClick={() => setImportOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
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
              className="mt-4 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
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
                className="rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-200 hover:border-slate-600"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={importLoading}
                className="rounded-lg bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                提交导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
