import { SideNav } from "./components/duel/side-nav";
import { LobbyScreen } from "./components/duel/lobby-screen";

export default function HomePage() {
  return (
    <SideNav>
      <LobbyScreen />
    </SideNav>
  );
}
