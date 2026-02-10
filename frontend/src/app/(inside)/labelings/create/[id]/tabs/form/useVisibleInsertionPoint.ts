import { useState, useCallback, useEffect } from "react";

/**
 * Hook para gerenciar qual insertion point está visível na tela.
 * Prioriza o ponto mais abaixo que esteja pelo menos 50% visível.
 * Permite override via hover do usuário.
 */
export function useVisibleInsertionPoint() {
  const [autoVisiblePointId, setAutoVisiblePointId] = useState<string | null>(
    null,
  );
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  // O ponto visível é o que tem hover, ou o calculado automaticamente
  const visiblePointId = hoveredPointId ?? autoVisiblePointId;

  const VISIBILITY_THRESHOLD = 0.5; // 50% do elemento deve estar visível

  /**
   * Calcula qual insertion point deve estar visível baseado na posição do scroll.
   * Regra: Mostra o insertion point mais abaixo que esteja suficientemente visível.
   */
  const updateVisiblePoint = useCallback(() => {
    const allPoints = document.querySelectorAll<HTMLElement>(
      "[data-insertion-point]",
    );

    if (allPoints.length === 0) {
      setAutoVisiblePointId(null);
      return;
    }

    // Limites da viewport atual
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;

    // Procura o ponto mais abaixo que esteja visível
    let selectedPoint: { id: string | null; top: number } = {
      id: null,
      top: -Infinity,
    };

    allPoints.forEach((point) => {
      const rect = point.getBoundingClientRect();
      const pointTop = rect.top + window.scrollY;
      const pointBottom = pointTop + rect.height;

      // Calcula área visível do elemento
      const visibleStart = Math.max(pointTop, viewportTop);
      const visibleEnd = Math.min(pointBottom, viewportBottom);
      const visibleSize = Math.max(0, visibleEnd - visibleStart);
      const visibilityRatio = visibleSize / rect.height;

      // Se está suficientemente visível E é o mais abaixo até agora
      const isVisible = visibilityRatio >= VISIBILITY_THRESHOLD;
      const isLowerThanCurrent = pointTop > selectedPoint.top;

      if (isVisible && isLowerThanCurrent) {
        selectedPoint = {
          id: point.getAttribute("data-insertion-point"),
          top: pointTop,
        };
      }
    });

    setAutoVisiblePointId(selectedPoint.id);
  }, []);

  useEffect(() => {
    updateVisiblePoint();

    const handleUpdate = () => {
      requestAnimationFrame(updateVisiblePoint);
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [updateVisiblePoint]);

  /**
   * Callbacks para controle de hover do usuário
   */
  const handleMouseEnter = useCallback((pointId: string) => {
    setHoveredPointId(pointId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Não limpa imediatamente - mantém até novo hover ou scroll
  }, []);

  // Limpa hover quando usuário faz scroll
  useEffect(() => {
    const clearHoverOnScroll = () => {
      setHoveredPointId(null);
    };

    window.addEventListener("scroll", clearHoverOnScroll, true);
    return () => {
      window.removeEventListener("scroll", clearHoverOnScroll, true);
    };
  }, []);

  return {
    visiblePointId,
    updateVisiblePoint,
    handleMouseEnter,
    handleMouseLeave,
  };
}
