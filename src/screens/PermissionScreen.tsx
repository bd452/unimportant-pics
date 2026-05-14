import type { PermissionResponse } from "expo-media-library";
import { PermissionGate } from "../components/PermissionGate";

type PermissionScreenProps = {
  permission: PermissionResponse | null;
  onRequestAccess: () => void;
};

export function PermissionScreen({
  permission,
  onRequestAccess
}: PermissionScreenProps) {
  return (
    <PermissionGate
      permission={permission}
      onRequestAccess={onRequestAccess}
    />
  );
}
