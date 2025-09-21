import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Map background with overlay */}
      <div className="absolute inset-0">
        {/* Map image as background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/back.png)',
            filter: 'brightness(0.5) saturate(0.8) contrast(1.1)',
          }}
        />
        
        {/* Dark overlay with green/teal gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-teal-900/60 to-emerald-900/70" />
        
        {/* Animated subtle overlays */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/6 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
      </div>

      {/* Logo positioned in corner */}
      <div className="absolute top-8 left-8 z-10">
        <Image
          src="/BP-logo-site.png"
          alt="Bucureștiul Posibil"
          width={120}
          height={36}
          className="drop-shadow-2xl"
          priority
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Content container with backdrop */}
          <div className="backdrop-blur-sm bg-black/25 rounded-3xl p-8 md:p-12 lg:p-16 border border-emerald-300/20 shadow-2xl shadow-emerald-900/30">
            {/* Main heading with dramatic typography */}
            <div className="mb-16">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-400 to-teal-400 leading-tight mb-8 tracking-tight drop-shadow-2xl">
                Mulțumim!
              </h1>
              
              {/* Glowing subtitle */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 blur-xl rounded-full"></div>
                <p className="relative text-xl md:text-2xl lg:text-3xl text-white/95 font-light leading-relaxed max-w-3xl mx-auto drop-shadow-lg">
                  Vă mulțumim pentru propuneri și voturi.
                  <br className="hidden sm:block" />
                  Panoramele vor fi accesibile aici începând cu 3 octombrie.
                </p>
              </div>
            </div>

            {/* Event section with Facebook link */}
            <div className="mb-12">
              <p className="text-lg md:text-xl text-white/80 mb-8 font-light drop-shadow-lg">
                Vă așteptăm între 3 și 5 Oct la expoziția de lansare:
              </p>
              
              <div className="flex justify-center">
                {/* Facebook Event Link */}
                <a
                  href="https://www.facebook.com/share/17CeD9k5uZ/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden bg-gradient-to-br from-cyan-500/30 to-blue-500/30 backdrop-blur-md border border-cyan-300/20 rounded-2xl p-6 transition-all duration-500 hover:scale-105 hover:border-cyan-300/40 hover:shadow-2xl hover:shadow-cyan-500/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/0 to-blue-600/0 group-hover:from-cyan-600/15 group-hover:to-blue-600/15 transition-all duration-500"></div>
                  <div className="relative flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-white font-semibold group-hover:text-cyan-300 transition-colors drop-shadow-sm">Evenimentul pe Facebook</div>
                      <div className="text-white/70 text-sm drop-shadow-sm">Detalii despre expoziție</div>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* Bottom decorative element */}
            <div className="opacity-40">
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent mx-auto"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating elements for extra visual flair */}
      <div className="absolute top-20 right-20 w-2 h-2 bg-white/40 rounded-full animate-ping"></div>
      <div className="absolute bottom-32 left-20 w-1 h-1 bg-green-400/60 rounded-full animate-ping delay-700"></div>
      <div className="absolute top-1/2 right-10 w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-ping delay-1000"></div>
    </div>
  );
}