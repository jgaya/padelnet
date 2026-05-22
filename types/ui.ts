export type DatePickerProps = {
  label?: string;
  initialValue?: string;
  onChange: (value: string) => void;
  className?: string;
};

export type RouteProps = {
  path: string;
  text: string;
  clase?: string;
  icon?: string;
  onClick?: ((open: boolean) => void) | null;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark"
    | "link";
  size?: "sm" | "lg";
  disabled?: boolean;
};

export type ListOpts = {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  searchBy?: string;
  includeDeleted?: boolean;
};

export type ParamValue = string | number | null | undefined;


export type ConfirmationModalProps = {
  onConfirm: () => void;
  title: string;
  message: string;
  tooltip: string;
  clase?: string;
  variant?: string;
  textBtn?: string;
};