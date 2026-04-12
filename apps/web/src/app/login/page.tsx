import Image from 'next/image'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-background rounded-lg shadow-sm border border-border p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.jpeg"
            alt="CRM Fidelização Clínicas"
            width={80}
            height={80}
            style={{ objectFit: 'contain' }}
            priority
          />
          <h1 className="mt-4 text-2xl font-semibold text-text-primary">CRM Clínicas</h1>
          <p className="text-text-secondary text-sm mt-1">Acompanhamento pós-consulta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
