import { useEffect, useState } from 'react'
import { parseHash, type Route } from './route'
import Home from './screens/Home'
import Request from './screens/Request'

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'request': return <Request />
    default: return <Home />
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const on = () => { setRoute(parseHash(window.location.hash)); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return <Screen key={JSON.stringify(route)} route={route} />
}
