import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
// Notice this is only an object, not a full Auth.js instance
export default {
    providers: [
        Credentials({
          authorize: async (credentials) => {
            console.log({credentials})
            
            if(credentials.email !== "test@test.com"){
                throw new Error("Invalid credential")
            }

            return {
                id: "1",
                name: "Test user",
                email: "test@test.com"
            }
          },
        }),
      ],
} satisfies NextAuthConfig