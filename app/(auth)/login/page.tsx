"use client"
import FormLogin from "../../components/form-login"

export default function LoginPage({
  searchParams,
}: {
  searchParams : {verified: string}
}){

    const isVerified = searchParams.verified === "true";

    return <FormLogin isVerified= {isVerified}/> 
}
