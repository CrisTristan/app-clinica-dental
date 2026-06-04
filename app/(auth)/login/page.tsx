"use client"
import FormLogin from "../../components/form-login"
import { use } from "react"

export default function LoginPage({
  searchParams,
}: {
  searchParams : Promise<{verified?: string}>
}){

    const params = use(searchParams);
    const isVerified = params.verified === "true";

    return <FormLogin isVerified= {isVerified}/> 
}
