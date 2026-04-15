import Sidebar from "../components/Sidebar";
import BalancePanel from "../components/BalancePanel";

export default function Preview(){

  return(
    <div>

      <Sidebar/>

      <div style={{marginLeft:"260px", padding:"20px"}}>
        <BalancePanel/>
        <h1>Preview Page</h1>
      </div>

    </div>
  )
}