import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PatientService } from "../types/types"

export default function PatientServiceCard({ name, activeService, totalCost, balance }: PatientService) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{name}</span>
          <Badge variant="secondary">{activeService}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium">Total Cost</span>
          <span className="text-lg font-bold">${totalCost?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Balance</span>
          <span className="text-lg font-bold text-red-500">${balance?.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  )
}