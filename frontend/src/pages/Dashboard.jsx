import { useCallback, useEffect, useState } from "react";
import { getDashboardData, searchTelemetry } from "../services/dashboardService";
import MissionStatusCard from "../components/MissionStatusCard";
import LatestTelemetryCard from "../components/LatestTelemetryCard";
import StatisticsCard from "../components/StatisticsCard";
import MetricsCard from "../components/MetricsCard";
import TelemetryCharts from "../components/TelemetryCharts";
import TelemetryFilters from "../components/TelemetryFilters";
import SearchResultsCard from "../components/SearchResultsCard";
import TrendsCard from "../components/TrendsCard";
import AlertsCard from "../components/AlertsCard";
import IncidentPage from "./IncidentPage";
import { buildIncidentFromAlert } from "../utils/incidentUtils";

const REFRESH_INTERVAL = 5000;

export default function Dashboard({ token, onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchFilters, setSearchFilters] = useState(null);
  const [searchActive, setSearchActive] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeIncident, setActiveIncident] = useState(null);

  const loadDashboard = useCallback(async function () {
    try {
      const data = await getDashboardData(token);
      setDashboard(data);
      setError(null);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") { onLogout?.(); return; }
      console.error("Failed to load dashboard:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  const loadSearchResults = useCallback(async function (filters) {
    if (!filters) return;
    try {
      setSearchLoading(true);
      setSearchError(null);
      const results = await searchTelemetry({
        satelliteId: filters.satelliteId,
        severity: filters.severity,
        limit: 100,
        token
      });
      setSearchResults(results);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") { onLogout?.(); return; }
      console.error("Failed to search telemetry:", err);
      setSearchError(err.message);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    loadDashboard();
    const intervalId = setInterval(() => loadDashboard(), REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [loadDashboard]);

  useEffect(() => {
    if (!searchActive || !searchFilters) return undefined;
    loadSearchResults(searchFilters);
    const intervalId = setInterval(() => loadSearchResults(searchFilters), REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [searchActive, searchFilters, loadSearchResults]);

  function handleApplyFilters(filters) {
    setSearchFilters(filters);
    setSearchActive(true);
    setSearchError(null);
  }

  function handleClearFilters() {
    setSearchFilters(null);
    setSearchActive(false);
    setSearchResults([]);
    setSearchError(null);
  }

  function handleViewIncident(alert, index) {
    setActiveIncident(buildIncidentFromAlert(alert, index));
  }

  function handleBackFromIncident() {
    setActiveIncident(null);
  }

  if (activeIncident) {
    return (
      <IncidentPage
        incident={activeIncident}
        history={dashboard?.history || []}
        token={token}
        onBack={handleBackFromIncident}
      />
    );
  }

  if (loading) return <div><h2>Loading Mission Dashboard...</h2></div>;
  if (error) {
    return (
      <div>
        <h2>MissionVault AI</h2>
        <p>Failed to load dashboard.</p>
        <p>{error}</p>
        <button onClick={onLogout}>Return to login</button>
      </div>
    );
  }
  if (!dashboard) return <div><h2>No dashboard data available.</h2></div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        <h1>MissionVault AI</h1>
        <button onClick={onLogout}>Log out</button>
      </div>
      <MissionStatusCard status={dashboard.mission_status} />
      <LatestTelemetryCard latest={dashboard.latest} />
      <StatisticsCard statistics={dashboard.statistics} />
      <MetricsCard metrics={dashboard.metrics} />
      <TelemetryCharts history={dashboard.history} />
      <TelemetryFilters onApply={handleApplyFilters} onClear={handleClearFilters} loading={searchLoading} />
      <SearchResultsCard results={searchResults} loading={searchLoading} error={searchError} activeFilters={searchActive} />
      <TrendsCard trends={dashboard.trends} />
      <AlertsCard alerts={dashboard.alerts} onViewIncident={handleViewIncident} />
    </div>
  );
}
