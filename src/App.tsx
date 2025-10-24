import { Layout, Typography, Card } from "antd";
import MetroMapContainer from "./Components/MetroMapContainer";
import "antd/dist/reset.css";
import "leaflet/dist/leaflet.css";
import "./App.css";

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Layout style={{ height: "100vh", width: "100%", overflow: "hidden" }}>
      <Header
        style={{
          background: "#001529",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          width: "100%",
          height: "64px",
          flexShrink: 0,
        }}
      >
        <Title level={3} style={{ color: "white", margin: 0 }}>
          🚇 OpenSG Metro City
        </Title>
      </Header>
      <Content
        style={{
          padding: "24px",
          width: "100%",
          height: "calc(100vh - 64px)",
          overflow: "hidden",
        }}
      >
        <Card
          title='🚉 지하철 노선도'
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
          bodyStyle={{
            height: "calc(100% - 57px)",
            padding: "16px",
            overflow: "hidden",
          }}
        >
          <MetroMapContainer />
        </Card>
      </Content>
    </Layout>
  );
}

export default App;
