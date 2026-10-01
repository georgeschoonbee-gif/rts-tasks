import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="login-page">
      <form className="login-card" action={login}>
        <div className="login-brand">RTS <span>TASKS</span></div>
        <div style={{color:'#777', fontSize:13}}>RumiTech Solutions</div>
        <h1>Log in</h1>
        <p>View, complete and manage assigned work.</p>
        {error && <div className="error">{error}</div>}
        <div className="field"><label>Email</label><input name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label>Password</label><input name="password" type="password" required autoComplete="current-password" /></div>
        <button className="btn" type="submit" style={{width:'100%'}}>Log in</button>
      </form>
    </main>
  )
}
