import PatientManagement from "../../components/patient-management"
import NavBar from "../../components/navBar"
import { authentication } from "@/app/actions/authentication";
import { auth } from "@/auth";

export default async function pacientes(){

    const session = await auth();
    
    if(session?.user?.role !== "admin"){
        return <div>Tu no eres Admin</div>
    }
    
    return(
        <div> 
            <PatientManagement/> :   
        </div>
    )
}