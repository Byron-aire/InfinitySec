import { NavLink } from 'react-router-dom';

/**
 * Tab bar that links between paired tool routes (e.g. Passwords: Check / Generate).
 * Each tab is a real route, so tabs are deep-linkable and the active one is
 * highlighted automatically via NavLink's `isActive`.
 */
export default function ToolTabs({ tabs }) {
  return (
    <div className="tool-tabs" role="tablist">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          role="tab"
          className={({ isActive }) => `tool-tab${isActive ? ' tool-tab--active' : ''}`}
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
