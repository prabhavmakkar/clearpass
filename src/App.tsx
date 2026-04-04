import Nav from './components/Nav'
import Hero from './components/Hero'
import Story from './components/Story'
import Features from './components/Features'

export default function App() {
  return (
    <div className="bg-white text-black">
      <Nav />
      <Hero />
      <hr className="mx-auto max-w-5xl border-gray-100" />
      <Story />
      <hr className="mx-auto max-w-5xl border-gray-100" />
      <Features />
    </div>
  )
}
