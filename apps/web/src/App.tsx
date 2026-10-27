import { useEffect, useState } from 'react'
import { parseHash, type Route } from './route'
import Home from './screens/Home'
import Call from './screens/Call'
import Debrief from './screens/Debrief'
import Job from './screens/Job'
import Programme from './screens/Programme'
import Request from './screens/Request'

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'request': return <Request />
    case 'job': return <Job id={route.id} />
    case 'programme': return <Programme id={route.id} />
    case 'debrief': return <Debrief callId={route.callId} />
    case 'call': return <Call versionId={route.versionId} level={route.level} drillLineId={route.drillLineId} />
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
