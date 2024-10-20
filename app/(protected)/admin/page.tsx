import {auth} from "@/auth"

export default async function AdminPage(){

    const session = await auth();
    
    if(session?.user?.role !== "admin"){
        return <div>Tu no eres Admin</div>
    }

    return (<div>
        <pre>
        {
            JSON.stringify(session, null, 2)
        }
        </pre>
    </div>)
}