import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import PostgresAdapter from '@auth/pg-adapter'
import { Pool } from '@neondatabase/serverless'

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return {
    adapter: PostgresAdapter(pool),
    providers: [Google],
    pages: {
      signIn: '/sign-in',
    },
    callbacks: {
      session({ session, user }) {
        session.user.id = String(user.id)
        return session
      },
    },
  }
})
