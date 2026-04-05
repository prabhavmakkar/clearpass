import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import Story from '@/components/landing/Story'
import Features from '@/components/landing/Features'
import Waitlist from '@/components/landing/Waitlist'
import Footer from '@/components/landing/Footer'

export default function HomePage() {
  return (
    <div className="bg-white text-black">
      <Nav />
      <Hero />
      <hr className="mx-auto max-w-5xl border-gray-100" />
      <Story />
      <hr className="mx-auto max-w-5xl border-gray-100" />
      <Features />
      <hr className="mx-auto max-w-5xl border-gray-100" />
      <Waitlist />
      <Footer />
    </div>
  )
}
