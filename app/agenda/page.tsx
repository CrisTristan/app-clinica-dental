"use client"
import NavBar from "../components/navBar";
import Scheduler from "../components/scheduler";
import { Suspense } from "react";

export default function Agenda(){

    return(
        <div>
            <NavBar/>
            <Scheduler/>
        </div>
    );
}