export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-background rounded-lg shadow-sm border border-border p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">CRM Clínicas</h1>
          <p className="text-text-secondary text-sm mt-1">Acompanhamento pós-consulta</p>
        </div>
        <p className="text-center text-text-secondary text-sm">Login será implementado na Etapa 3</p>
      </div>
    </div>
  )
}
