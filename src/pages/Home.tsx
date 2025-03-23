import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="altone-font text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Digital business cards</span>
                  <span className="block text-primary mt-3">for modern networking.</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Compartilhe instantaneamente. Mantenha-se conectado.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link
                      to="/register"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark md:py-4 md:text-lg md:px-10"
                    >
                      Comprar Agora
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <img
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
            src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2850&q=80"
            alt="Cartões de visita digitais"
          />
        </div>
      </div>

      {/* Titanium Card Section */}
      <div className="relative bg-gray-900">
        <div className="max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <div className="relative lg:grid lg:grid-cols-2 lg:gap-8">
            <div className="lg:col-start-1">
              <img
                src="/titanium-card.png"
                alt="Cartão Titanium"
                className="w-full max-w-md mx-auto"
              />
            </div>
            <div className="mt-10 lg:mt-0 lg:col-start-2">
              <div className="text-white">
                <img
                  src="/logo-white.png"
                  alt="Logo"
                  className="h-12 mb-6"
                />
                <span className="text-xl tracking-wider">TITANIUM</span>
                <p className="mt-3 text-lg">
                  Nosso produto mais sofisticado e luxuoso.
                </p>
                <div className="mt-8">
                  <Link
                    to="/register"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-black bg-white hover:bg-gray-100"
                  >
                    Adquira o Seu
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase">Recursos</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Tudo que você precisa em um cartão de visita moderno
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-md bg-primary text-white text-2xl mb-4">
                  📱
                </div>
                <h3 className="text-xl font-medium text-gray-900 text-center">Digital Primeiro</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Compartilhe suas informações de contato instantaneamente com qualquer pessoa, em qualquer lugar.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-md bg-primary text-white text-2xl mb-4">
                  🔄
                </div>
                <h3 className="text-xl font-medium text-gray-900 text-center">Sempre Atualizado</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Mantenha suas informações atualizadas sem precisar reimprimir cartões.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-md bg-primary text-white text-2xl mb-4">
                  🌱
                </div>
                <h3 className="text-xl font-medium text-gray-900 text-center">Ecológico</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Reduza o desperdício de papel com nossa solução digital sustentável.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}