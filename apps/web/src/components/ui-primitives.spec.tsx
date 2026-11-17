import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefreshCw } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.js';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { Checkbox } from '@/components/ui/checkbox.js';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog.js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.js';
import { Input } from '@/components/ui/input.js';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Textarea } from '@/components/ui/textarea.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.js';

describe('shared Base UI controls', () => {
  it('preserves semantic button variants, disabled state and click behavior', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<>
      <Button variant="default" onClick={onClick}>Salvar</Button>
      <Button variant="secondary">Ação sobre azul</Button>
      <Button variant="outline">Cancelar</Button>
      <Button variant="ghost">Navegar</Button>
      <Button variant="destructive">Remover</Button>
      <Button disabled>Carregando</Button>
    </>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('data-variant', 'default');
    expect(screen.getByRole('button', { name: 'Ação sobre azul' })).toHaveAttribute('data-variant', 'secondary');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('data-variant', 'outline');
    expect(screen.getByRole('button', { name: 'Navegar' })).toHaveAttribute('data-variant', 'ghost');
    expect(screen.getByRole('button', { name: 'Remover' })).toHaveAttribute('data-variant', 'destructive');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await user.click(screen.getByRole('button', { name: 'Carregando' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders persistent alerts, status badges and an announced loading placeholder', () => {
    render(<>
      <Alert variant="destructive"><AlertTitle>Falha</AlertTitle><AlertDescription>Tente novamente.</AlertDescription></Alert>
      <Badge variant="secondary">Aguardando triagem</Badge>
      <Skeleton aria-label="Carregando painel" />
    </>);

    expect(screen.getByRole('alert')).toHaveTextContent('Falha');
    expect(screen.getByText('Aguardando triagem')).toBeInTheDocument();
    expect(screen.getByLabelText('Carregando painel')).toBeInTheDocument();
  });

  it('keeps labels attached to fields and exposes controlled checkbox changes', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<>
      <label htmlFor="synthetic-name">Nome gerado por IA</label>
      <Input id="synthetic-name" />
      <label htmlFor="synthetic-message">Mensagem</label>
      <Textarea id="synthetic-message" />
      <Checkbox aria-label="Aceito a demonstração" onCheckedChange={onCheckedChange} />
    </>);

    expect(screen.getByRole('textbox', { name: 'Nome gerado por IA' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Mensagem' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Aceito a demonstração' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('keeps the citizen evaluation select native and controlled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<>
      <label htmlFor="rating">Sua avaliação</label>
      <NativeSelect id="rating" defaultValue="" onChange={onChange}>
        <NativeSelectOption value="">Selecione</NativeSelectOption>
        <NativeSelectOption value="helpful">Ajudou</NativeSelectOption>
      </NativeSelect>
    </>);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sua avaliação' }), 'helpful');
    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole('combobox', { name: 'Sua avaliação' })).toHaveValue('helpful');
  });

  it('switches tabs with the keyboard and exposes the selected panel', async () => {
    const user = userEvent.setup();
    render(<Tabs defaultValue="operators">
      <TabsList aria-label="Cadastros API">
        <TabsTrigger value="operators">Operadores</TabsTrigger>
        <TabsTrigger value="citizens">Cidadãos</TabsTrigger>
      </TabsList>
      <TabsContent value="operators">Painel de operadores</TabsContent>
      <TabsContent value="citizens">Painel de cidadãos</TabsContent>
    </Tabs>);

    const operators = screen.getByRole('tab', { name: 'Operadores' });
    await user.click(operators);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Cidadãos' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tab', { name: 'Cidadãos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Painel de cidadãos');
  });

  it('closes dialogs on Escape and restores focus to their triggers', async () => {
    const user = userEvent.setup();
    render(<Dialog>
      <DialogTrigger>Pré-visualizar</DialogTrigger>
      <DialogContent>
        <DialogTitle>Prévia do comunicado</DialogTitle>
        <DialogDescription>Comunicado gerado por IA.</DialogDescription>
      </DialogContent>
    </Dialog>);

    const trigger = screen.getByRole('button', { name: 'Pré-visualizar' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Prévia do comunicado' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not run a destructive action when an alert dialog is cancelled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<AlertDialog>
      <AlertDialogTrigger>Remover cadastro</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Remover cadastro gerado por IA?</AlertDialogTitle>
        <AlertDialogDescription>Os dados serão removidos da base ativa.</AlertDialogDescription>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Confirmar remoção</AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>);

    await user.click(screen.getByRole('button', { name: 'Remover cadastro' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('supports keyboard selection in a secondary actions menu and named tooltips', async () => {
    const user = userEvent.setup();
    render(<>
      <DropdownMenu>
        <DropdownMenuTrigger>Mais ações do comunicado</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Baixar PNG</DropdownMenuItem>
          <DropdownMenuItem>Compartilhar manualmente</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipProvider>
      <Tooltip>
        <TooltipTrigger aria-label="Atualizar"><RefreshCw aria-hidden="true" /></TooltipTrigger>
        <TooltipContent>Atualizar dados API</TooltipContent>
      </Tooltip>
      </TooltipProvider>
    </>);

    const menuTrigger = screen.getByRole('button', { name: 'Mais ações do comunicado' });
    menuTrigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Baixar PNG' })).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    const tooltipTrigger = screen.getByRole('button', { name: 'Atualizar' });
    tooltipTrigger.focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Atualizar dados API');
  });
});
